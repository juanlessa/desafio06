import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';
import Transaction from '../models/Transaction';

interface Request {
    filePath: string;
}
interface CSVTransaction {
    title: string;
    value: number;
    type: 'income' | 'outcome';
    category: string;
}

class ImportTransactionsService {
    public async execute({ filePath }: Request): Promise<Transaction[]> {
        const contactsReadStream = fs.createReadStream(filePath);

        const parsers = csvParse({
            from_line: 2,
        });

        const parseCSV = contactsReadStream.pipe(parsers);

        const transactions: CSVTransaction[] = [];
        const categories: string[] = [];

        parseCSV.on('data', async line => {
            const [title, type, value, category] = line.map((cell: string) =>
                cell.trim(),
            );

            if (!title || !type || !value) return;

            categories.push(category);

            transactions.push({ title, type, value, category });
        });

        await new Promise(resolve => parseCSV.on('end', resolve));

        //verify categories that already exist
        const categoriesRepository = getRepository(Category);

        const existentCategories = await categoriesRepository.find({
            where: {
                title: In(categories),
            },
        });

        const existentCategoryTitles = existentCategories.map(
            category => category.title,
        );

        const addCategoryTitle = categories
            .filter(category => !existentCategoryTitles.includes(category))
            .filter((value, index, self) => self.indexOf(value) === index);

        //add categories on database
        const newCategories = categoriesRepository.create(
            addCategoryTitle.map(title => ({ title })),
        );
        await categoriesRepository.save(newCategories);
        const allCategories = [...newCategories, ...existentCategories];
        //get transactions repository
        const transactionsRepository = getCustomRepository(
            TransactionsRepository,
        );
        //add transactions on database
        const createdTransactions = transactionsRepository.create(
            transactions.map(transaction => ({
                title: transaction.title,
                value: transaction.value,
                type: transaction.type,
                category: allCategories.find(
                    category => category.title === transaction.category,
                ),
            })),
        );
        await transactionsRepository.save(createdTransactions);

        await fs.promises.unlink(filePath);

        return createdTransactions;
    }
}

export default ImportTransactionsService;
