/**
 * INSTITUTIONAL FEE RECIPIENT REGISTRY
 * Version: 3.4.0 (BEP2 Support Integrated)
 */

export const FEE_RECIPIENTS = {
    // --- EVM COMPATIBLE GROUP (19 Chains) ---
    evm: process.env.NEXT_PUBLIC_ADMIN_VAULT_ADDRESS || '0x7f3f4206017C0aACF7A94C9eF7B80563984aD288',

    // --- LEDGER / ACCOUNT NODES ---
    xrpLedger: "rpgFikx5ncjZ73C5Z4aRvnL6PAKGsiowVB",
    polkadot: "5HVT8SyeHh5FSTBbtKPfwUhVSZt3XMLuBshyrRz5ZoswikF3",
    kusama: "J14nmKWv46BC713f2CiqS4VbAAHL2A5eFYjF6G33c6SU18T",
    bep2: "bnb1jxfyc9p6uul6v6mqn0657v6as4h5666yv9gzhu",

    // --- SOLANA-LIKE / SMART CONTRACT NODES ---
    solana: "BUNZrkGLBM13BaFEovCsmbS12hPEjVpxCCLWwiy2dKXd",
    near: "bf16271a2654c88387faaf20c943055cc8433d734be9e634a6d8859476261ef7",
    cosmos: "cosmos1mjxntgarkrwnccrgsdxw79575p3m6qly05gw9d",
    osmosis: "osmo1mjxntgarkrwnccrgsdxw79575p3m6qly80m7nl",
    secretNetwork: "secret1ecqdkvxfef6z4vazgwsydkd55m46nxrz5pljm9",
    injective: "cosmos1mjxntgarkrwnccrgsdxw79575p3m6qly05gw9d",
    celestia: "celestia1mjxntgarkrwnccrgsdxw79575p3m6qly77e7lq",
    cardano: "addr10248ed513ef5c3933001643e241f414f1096f33446f9fa3f15",
    tron: "TG5Zv892gfFJaQGs2ZnyGJzPK9i34DxoKo",
    algorand: "QH3HUS5RQ6UIPMAH6BQA56EVBARX7SQEJMSWVVOI4ADMEYZA5Z6LEPQ34U",
    tezos: "tz1XJZGZMySCnUdBjEJXrnN5VJEsRzUaagTF",
    aptos: "0xaptosadminvaultplaceholder",
    sui: "0xfd0608a4e530355d0f8d120065c75c1e0dbb0eb54ed7f3ab0eb1bd96009ccdd1",

    // --- UTXO NODES ---
    bitcoin: "bc1qx56kw23gv9e4u2mgl4dlkzkwpjas3rz3r54k6m",
    litecoin: "ltc1qwjnwepkndc39hnj0vg6h7ta9f8jd374ucrdyqq",
    dogecoin: "D6vz5moDmnWNT2Ykhb3eHWPcV2rkWTw32a",
};

/**
 * Resolves the institutional fee recipient address for any supported chain.
 */
export function getFeeRecipient(chainName: string): string {
    const name = chainName.toLowerCase();

    // 1. EVM GROUPING (19 Chains)
    const evmNames = [
        "ethereum", "polygon", "base", "linea", "optimism", "arbitrum", "blast",
        "avalanche", "bsc", "celo", "zksync", "scroll", "sei", "mantle",
        "opbnb", "palm", "hemi", "swellchain", "unichain"
    ];
    if (evmNames.includes(name)) return FEE_RECIPIENTS.evm;

    // 2. LEDGER HANDSHAKE
    if (name.includes("xrp")) return FEE_RECIPIENTS.xrpLedger;
    if (name === "polkadot") return FEE_RECIPIENTS.polkadot;
    if (name === "kusama") return FEE_RECIPIENTS.kusama;
    if (name === "bnb beacon chain" || name === "bep2") return FEE_RECIPIENTS.bep2;

    // 3. SOLANA-LIKE HANDSHAKE
    if (name === "solana") return FEE_RECIPIENTS.solana;
    if (name === "near") return FEE_RECIPIENTS.near;
    if (name === "cosmos") return FEE_RECIPIENTS.cosmos;
    if (name === "osmosis") return FEE_RECIPIENTS.osmosis;
    if (name === "secret") return FEE_RECIPIENTS.secretNetwork;
    if (name === "injective") return FEE_RECIPIENTS.injective;
    if (name === "celestia") return FEE_RECIPIENTS.celestia;
    if (name === "cardano") return FEE_RECIPIENTS.cardano;
    if (name === "tron") return FEE_RECIPIENTS.tron;
    if (name === "algorand") return FEE_RECIPIENTS.algorand;
    if (name === "tezos") return FEE_RECIPIENTS.tezos;
    if (name === "aptos") return FEE_RECIPIENTS.aptos;
    if (name === "sui") return FEE_RECIPIENTS.sui;

    // 4. UTXO HANDSHAKE
    if (name === "bitcoin") return FEE_RECIPIENTS.bitcoin;
    if (name === "litecoin") return FEE_RECIPIENTS.litecoin;
    if (name === "dogecoin") return FEE_RECIPIENTS.dogecoin;

    // Fallback to primary EVM vault
    return FEE_RECIPIENTS.evm;
}
