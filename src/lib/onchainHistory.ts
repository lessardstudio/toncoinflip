import { TonClient } from '@ton/ton';
import { Address, Message, Transaction, type CommonMessageInfoInternal } from '@ton/core';
import { GameHistoryItem } from '@/lib/utils';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || 'EQDTu0cHyVvEaUMF9NYk9p_MAUKtHxR_mZC15mvoB9tYwJ6r';
const FLIP_OPCODE = 0x66b9a3fb;

const tonClient = new TonClient({
    endpoint: import.meta.env.VITE_TON_ENDPOINT || (
        import.meta.env.VITE_IS_TESTNET === 'true'
            ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
            : 'https://toncenter.com/api/v2/jsonRPC'
    ),
    apiKey: import.meta.env.VITE_TONCENTER_API_KEY
});

const isInternalMessage = (msg: Message | null | undefined): msg is Message & { info: CommonMessageInfoInternal } => {
    return Boolean(msg && msg.info.type === 'internal');
};

const normalizeAddressForComparison = (addr: Address | string | null | undefined): string => {
    if (!addr) return '';
    try {
        if (typeof addr === 'string') {
            return Address.parse(addr).toRawString().toLowerCase();
        }
        return addr.toRawString().toLowerCase();
    } catch {
        return String(addr).toLowerCase();
    }
};

const extractMessageText = (msg: Message | null | undefined): string => {
    if (!msg) return '';
    try {
        const slice = msg.body.beginParse();
        if (slice.remainingBits >= 32) {
            const op = slice.loadUint(32);
            if (op === 0) {
                return slice.loadStringTail() || '';
            }
        }
    } catch {
        // fall through
    }
    try {
        const slice = msg.body.beginParse();
        const maybe = slice.loadMaybeStringTail();
        return maybe || '';
    } catch {
        return '';
    }
};

const toTon = (coins: bigint | undefined): number => {
    if (typeof coins === 'undefined') return 0;
    return Number(coins) / 1e9;
};

const parseFlipSide = (msg: Message | null | undefined): boolean | null => {
    if (!isInternalMessage(msg)) return null;
    try {
        const slice = msg.body.beginParse();
        if (slice.remainingBits < 33) return null;
        const op = slice.loadUint(32);
        if (op !== FLIP_OPCODE) return null;
        return slice.loadBit();
    } catch {
        return null;
    }
};

const findOutcome = (tx: Transaction, userAddressNormalized: string): { status: 'win' | 'lost'; winAmount: number } | null => {
    for (const [, outMsg] of tx.outMessages) {
        if (!isInternalMessage(outMsg)) continue;
        const destNormalized = normalizeAddressForComparison(outMsg.info.dest);
        if (!destNormalized || destNormalized !== userAddressNormalized) continue;

        const messageText = extractMessageText(outMsg);
        const messageLower = messageText.toLowerCase().trim();
        const amount = toTon(outMsg.info.value.coins);

        if (messageLower.includes('win')) {
            return { status: 'win', winAmount: amount };
        }
        if (messageLower.includes('lost')) {
            return { status: 'lost', winAmount: 0 };
        }

        return amount > 0 ? { status: 'win', winAmount: amount } : { status: 'lost', winAmount: 0 };
    }

    return null;
};

export async function fetchOnchainHistory(walletAddress: string, limit: number = 50, contractAddress: string = CONTRACT_ADDRESS): Promise<GameHistoryItem[]> {
    if (!walletAddress) return [];

    const contractParsed = Address.parse(contractAddress);
    const transactions = await tonClient.getTransactions(contractParsed, { limit, archival: true });

    const userAddressNormalized = normalizeAddressForComparison(walletAddress);
    const history: GameHistoryItem[] = [];

    for (const tx of transactions) {
        if (!isInternalMessage(tx.inMessage)) {
            continue;
        }

        const srcNormalized = normalizeAddressForComparison(tx.inMessage.info.src);
        if (!srcNormalized || srcNormalized !== userAddressNormalized) {
            continue;
        }

        const side = parseFlipSide(tx.inMessage);
        if (side === null) {
            continue;
        }

        const outcome = findOutcome(tx, userAddressNormalized);
        if (!outcome) {
            continue;
        }

        const betAmount = toTon(tx.inMessage.info.value.coins);
        const txHashHex = tx.hash().toString('hex');
        const timestamp = tx.now * 1000;

        history.push({
            id: `${timestamp}-${txHashHex.slice(0, 8)}`,
            timestamp,
            amount: betAmount,
            side,
            status: outcome.status,
            winAmount: outcome.status === 'win' ? outcome.winAmount : undefined,
            txHash: txHashHex,
        });
    }

    return history;
}
