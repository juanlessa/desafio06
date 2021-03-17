import AppError from '../errors/AppError';
import { getCustomRepository, getRepository } from 'typeorm';
import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
    title: string;
    value: number;
    type: 'income' | 'outcome';
    category: string;
}

class CreateTransactionService {
    public async execute({
        title,
        type,
        value,
        category,
    }: Request): Promise<Transaction> {
        //transaction type = "income" or "outcome"
        if (!['income', 'outcome'].includes(type)) {
            throw new AppError('Transaction type is invalid.');
        }

        //get tramsaction repository
        const transactionsRepository = getCustomRepository(
            TransactionsRepository,
        );

        // outcome should not be able to bigger then total balance
        if (
            type === 'outcome' &&
            value > (await transactionsRepository.getBalance()).total
        ) {
            throw new AppError('You do not have enough balance.');
        }
        //get categories repository
        const categoriesRepository = getRepository(Category);
        //create category if doesnt exist
        let transactionCategiry = await categoriesRepository.findOne({
            where: { title: category },
        });
        if (!transactionCategiry) {
            transactionCategiry = categoriesRepository.create({
                title: category,
            });
            await categoriesRepository.save(transactionCategiry);
        }

        const transaction = transactionsRepository.create({
            title,
            value,
            type,
            category_id: transactionCategiry.id,
        });
        await transactionsRepository.save(transaction);
        return transaction;
    }
}

export default CreateTransactionService;
