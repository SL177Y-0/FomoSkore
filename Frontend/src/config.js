import { http, createConfig } from "wagmi";
import { base, mainnet } from "wagmi/chains";
import { walletConnect } from "wagmi/connectors";

const projectId = "c6932881eff26db9622e70902eced2f9";

export const config = createConfig({
  chains: [mainnet, base],
  connectors: [
    walletConnect({ projectId }),
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
  },
});
