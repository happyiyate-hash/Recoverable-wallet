import { useRouter } from 'next/router';
import React from 'react';
import { IconButton } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

const TokenDetailsClient = () => {
    const router = useRouter();

    const handleNavigateToInfo = () => {
        router.push('/token-info');
    }  

    const handleNavigateToTransaction = (transactionId) => {
        router.push(`/transaction-details?id=${transactionId}`);
    }  

    const transactionHistory = [/* Fetch or define your transaction history data here */];

    return (
        <div>
            <header>
                <IconButton onClick={handleNavigateToInfo}>
                    <InfoIcon />
                </IconButton>
                <h1>Token Details</h1>
            </header>
            <ul>
                {transactionHistory.map(transaction => (
                    <li key={transaction.id} onClick={() => handleNavigateToTransaction(transaction.id)} style={{ cursor: 'pointer' }}>
                        {transaction.description} - {transaction.amount} 
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default TokenDetailsClient;