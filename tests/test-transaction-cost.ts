import { expect } from "chai";
import { step } from "mocha-steps";

import { describeWithFrontier, customRequest } from "./util";

describeWithFrontier("Frontier RPC (Transaction cost)", (context) => {
	step("should reject unprotected (pre-EIP155) legacy transactions per RPC policy", async function () {
		// Simple transfer with gas limit 0, manually signed WITHOUT chain ID
		// (pre-EIP155 / "unprotected" legacy tx).
		const tx = await customRequest(context.web3, "eth_sendRawTransaction", [
			"0xf86180843b9aca00809412cb274aad8251c875c0bf6872b67d9983e53fdd01801ca00e28ba2dd3c5a3fd467\
			d4afd7aefb4a34b373314fff470bb9db743a84d674a0aa06e5994f2d07eafe1c37b4ce5471caecec29011f6f5b\
			f0b1a552c55ea348df35f",
		]);

		expect(tx.error).to.include({
			message: "unprotected legacy transactions are not allowed by RPC policy",
		});
	});
});
