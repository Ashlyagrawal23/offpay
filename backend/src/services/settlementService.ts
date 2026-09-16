import { Prisma, Transaction } from '@prisma/client';
import { prisma } from '../prisma';
import { PaymentInstruction } from '../types';

export class OptimisticLockError extends Error {}

/**
 * Where the actual ledger update happens. Runs inside a DB transaction so
 * either both the debit and credit happen, or neither does.
 *
 * `version` on User gives us optimistic locking: the UPDATE's WHERE clause
 * pins the row to the version we read, so if another transaction changed
 * it first, `updateMany` affects zero rows and we throw. In a demo the
 * idempotency layer should always catch true duplicates before we get
 * here — this is defense in depth against two *different* concurrent
 * transfers touching the same account.
 */
class SettlementService {
  async settle(
    instruction: PaymentInstruction,
    packetHash: string,
    bridgeNodeId: string,
    hopCount: number,
  ): Promise<Transaction> {
    return prisma.$transaction(async (tx) => {
      const sender = await tx.user.findUnique({ where: { vpa: instruction.senderVpa } });
      if (!sender) throw new Error(`Unknown sender VPA: ${instruction.senderVpa}`);

      const receiver = await tx.user.findUnique({ where: { vpa: instruction.receiverVpa } });
      if (!receiver) throw new Error(`Unknown receiver VPA: ${instruction.receiverVpa}`);

      const amount = new Prisma.Decimal(instruction.amount);
      if (amount.lessThanOrEqualTo(0)) {
        throw new Error('Amount must be positive');
      }

      if (sender.balance.lessThan(amount)) {
        console.warn(
          `Insufficient balance: ${sender.vpa} has ₹${sender.balance}, tried to send ₹${amount}`,
        );
        return this.recordRejected(tx, instruction, packetHash, bridgeNodeId, hopCount);
      }

      const debited = await tx.user.updateMany({
        where: { vpa: sender.vpa, version: sender.version },
        data: { balance: { decrement: amount }, version: { increment: 1 } },
      });
      if (debited.count === 0) throw new OptimisticLockError(`Concurrent update on ${sender.vpa}`);

      const credited = await tx.user.updateMany({
        where: { vpa: receiver.vpa, version: receiver.version },
        data: { balance: { increment: amount }, version: { increment: 1 } },
      });
      if (credited.count === 0) throw new OptimisticLockError(`Concurrent update on ${receiver.vpa}`);

      const txRecord = await tx.transaction.create({
        data: {
          packetHash,
          senderVpa: instruction.senderVpa,
          receiverVpa: instruction.receiverVpa,
          amount,
          signedAt: new Date(instruction.signedAt),
          settledAt: new Date(),
          bridgeNodeId,
          hopCount,
          status: 'SETTLED',
        },
      });

      console.log(
        `SETTLED ₹${amount} from ${sender.vpa} to ${receiver.vpa} ` +
          `(packetHash=${packetHash.slice(0, 12)}..., bridge=${bridgeNodeId}, hops=${hopCount})`,
      );

      return txRecord;
    });
  }

  private async recordRejected(
    tx: Prisma.TransactionClient,
    instruction: PaymentInstruction,
    packetHash: string,
    bridgeNodeId: string,
    hopCount: number,
  ): Promise<Transaction> {
    return tx.transaction.create({
      data: {
        packetHash,
        senderVpa: instruction.senderVpa,
        receiverVpa: instruction.receiverVpa,
        amount: new Prisma.Decimal(instruction.amount),
        signedAt: new Date(instruction.signedAt),
        settledAt: new Date(),
        bridgeNodeId,
        hopCount,
        status: 'REJECTED',
      },
    });
  }
}

export const settlementService = new SettlementService();
