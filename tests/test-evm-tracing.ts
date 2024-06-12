import { expect, use as chaiUse } from "chai";
import chaiAsPromised from "chai-as-promised";
import { AbiItem } from "web3-utils";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Foo from "../build/contracts/Foo.json";
import {
  GENESIS_ACCOUNT,
  GENESIS_ACCOUNT_PRIVATE_KEY,
  FIRST_CONTRACT_ADDRESS,
} from "./config";
import {
  createAndFinalizeBlock,
  customRequest,
  describeWithFrontier,
} from "./util";

chaiUse(chaiAsPromised);

describeWithFrontier("Frontier RPC (EVM Tracing)", (context) => {
  const BAR_CONTRACT_BYTECODE = Foo.bytecode;
  const FOO_CONTRACT_DEPLOYED_BYTECODE = Foo.deployedBytecode;
  const FOO_CONTRACT_ABI = Foo.abi as AbiItem[];

  it("evm trace transaction", async function () {
    this.timeout(15000);
    // Deploy contract
    const tx = await context.web3.eth.accounts.signTransaction(
      {
        from: GENESIS_ACCOUNT,
        data: BAR_CONTRACT_BYTECODE,
        value: "0x00",
        gasPrice: await context.web3.eth.getGasPrice(),
        gas: "0x100000",
      },
      GENESIS_ACCOUNT_PRIVATE_KEY
    );

    await customRequest(context.web3, "eth_sendRawTransaction", [
      tx.rawTransaction,
    ]);
    await createAndFinalizeBlock(context.web3);

    // Verify the contract is stored after the block is produced
    expect(
      await customRequest(context.web3, "eth_getCode", [FIRST_CONTRACT_ADDRESS])
    ).to.deep.equal({
      id: 1,
      jsonrpc: "2.0",
      result: FOO_CONTRACT_DEPLOYED_BYTECODE,
    });

    // Call contract
    const contract = new context.web3.eth.Contract(
      FOO_CONTRACT_ABI,
      FIRST_CONTRACT_ADDRESS,
      {
        from: GENESIS_ACCOUNT,
        gasPrice: await context.web3.eth.getGasPrice(),
      }
    );

    const tx1 = await context.web3.eth.accounts.signTransaction(
      {
        from: GENESIS_ACCOUNT,
        to: FIRST_CONTRACT_ADDRESS,
        data: contract.methods.callBar().encodeABI(),
        value: "0x00",
        gasPrice: await context.web3.eth.getGasPrice(),
        gas: "0x500000",
      },
      GENESIS_ACCOUNT_PRIVATE_KEY
    );
    await customRequest(context.web3, "eth_sendRawTransaction", [
      tx1.rawTransaction,
    ]);
    await createAndFinalizeBlock(context.web3);

    // trace both create and call transactions
    const traceCreate = await customRequest(
      context.web3,
      "debug_traceTransaction",
      [tx.transactionHash]
    );
    const traceCall = await customRequest(
      context.web3,
      "debug_traceTransaction",
      [tx1.transactionHash]
    );

    const createSnapshot = JSON.parse(readFileSync(
      resolve(__dirname, "./snapshots/evm-tracing-create.json"),
      "utf8"
    ));
    const callSnapshot = JSON.parse(readFileSync(
      resolve(__dirname, "./snapshots/evm-tracing-call.json"),
      "utf8"
    ));

    expect(traceCreate).to.deep.eq(createSnapshot);
    expect(traceCall).to.deep.eq(callSnapshot);
  })

  it('evm trace block', async function () {
    // when contract was created
    const traceFirstBlock = await customRequest(
      context.web3,
      "debug_traceBlockByNumber",
      ['0x01', { tracer: "callTracer" }]
    );
    // when contract is called
    const traceSecondBlock = await customRequest(
      context.web3,
      "debug_traceBlockByNumber",
      ['0x02', { tracer: "callTracer" }]
    );

    const firstBlockSnapshot = JSON.parse(readFileSync(
      resolve(__dirname, "./snapshots/first-block.json"),
      "utf8"
    ));
    const secondBlockSnapshot = JSON.parse(readFileSync(
      resolve(__dirname, "./snapshots/second-block.json"),
      "utf8"
    ));

    expect(traceFirstBlock).to.deep.eq(firstBlockSnapshot);
    expect(traceSecondBlock).to.deep.eq(secondBlockSnapshot);
  });
});
