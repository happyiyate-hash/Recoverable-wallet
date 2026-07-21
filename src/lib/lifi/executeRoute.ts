import { lifi } from "./config";
import { ethers } from "ethers";

/**
 * LI.FI EXECUTION ENGINE
 * Version: 1.0.0
 * Signs and broadcasts the multi-step bridge/swap sequence.
 */
export async function executeRoute({
  route,
  signer
}: {
  route: any;
  signer: ethers.Signer;
}) {
  try {
    console.log("[LIFI_EXECUTION] Initiating cross-chain handshake...");
    
    const updatedRoute = await lifi.executeRoute(route, {
      signer,
      updateRouteHook(updatedRoute) {
        console.log(`[LIFI_SYNC] Status: ${updatedRoute.status} | Tool: ${updatedRoute.steps[0].tool}`);
      }
    });

    return {
      success: true,
      route: updatedRoute
    };

  } catch (error: any) {
    console.error("[LIFI_EXECUTION_FAIL]", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
