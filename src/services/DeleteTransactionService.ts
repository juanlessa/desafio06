import AppError from '../errors/AppError';

import { getCustomRepository } from 'typeorm';
import TransactionRepository from '../repositories/TransactionsRepository';

interface Request {
    id: string;
}

class DeleteTransactionService {
    public async execute({ id }: Request): Promise<void> {
        const transactionsRepository = getCustomRepository(
            TransactionRepository,
        );
        //verify if transaction exists
        const transaction = await transactionsRepository.findOne(id);
        if (!transaction) {
            throw new AppError('Transaction does not exist');
        }

        await transactionsRepository.remove(transaction);
    }
}

export default DeleteTransactionService;
