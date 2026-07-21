import { ethers } from "ethers";

export async function approveToken(
  tokenAddress: string, 
  spender: string, 
  amount: string, 
  signer: ethers.Wallet | ethers.Signer,
  setPhase?: (phase: string) => void
) {
  // If the token is native (e.g. 0xeeee...), do not check or trigger approval 
  if (tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      return;
  }

  const erc20 = new ethers.Contract(
    tokenAddress,
    [
      "function allowance(address owner, address spender) public view returns (uint256)",
      "function approve(address spender, uint256 amount) public returns (bool)"
    ],
    signer
  );

  const ownerAddress = await signer.getAddress();
  const currentAllowance = await erc20.allowance(ownerAddress, spender);

  if (currentAllowance >= BigInt(amount)) {
      console.log(`[APPROVAL] Skipping. Allowance ${currentAllowance} covers ${amount}`);
      return;
  }

  if (setPhase) setPhase('APPROVING');
  console.log(`[APPROVAL] Requesting approval for ${amount} to spender ${spender}...`);

  const tx = await erc20.approve(spender, amount);
  await tx.wait();
  console.log(`[APPROVAL] Confirmed!`);
}
