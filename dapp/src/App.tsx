import { WsProvider,ApiPromise } from '@polkadot/api';
import { web3Accounts,web3Enable, web3FromAddress } from '@polkadot/extension-dapp';
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types"
import { BN, BN_ONE, formatBalance } from '@polkadot/util';
import { ChangeEvent, useEffect,useState } from 'react';
import { ContractPromise } from '@polkadot/api-contract';
import type { WeightV2 } from '@polkadot/types/interfaces'

import abi from './abi/erc20.json';

const NAME="RococoContracts";

const MAX_CALL_WEIGHT = new BN(5_000_000_000_000).isub(BN_ONE);
const PROOFSIZE = new BN(1_000_000);


const CONTRACT_ADDRESS="5DWNgGWW63qgN9YEEAni7KwNgTcbbNoqd673PXdH6BptMmX4";
const DEV_ACCOUNT_I_ADDRESS="5FNXJqU9i14rxvsmfCihVLFeDs68VZPjvqNqwMkGvfX9xiWT";
const DEV_ACCOUNT_II_ADDRESS="5Ev7FnAcuNwoPRF1Txb5YvyjMCeuBaMh8tHzcMqGYrCa3ZFe";



const App=()=> {
  const[api,setApi]= useState<ApiPromise>();
  const[accounts,setAccountsList]= useState<InjectedAccountWithMeta[]>([]);
  const[selectedAccount,setSelectedAccount]= useState<InjectedAccountWithMeta>();
  const[balance,setBalance]= useState<BN>();

  const setup = async() => {
    const wsProvider=new WsProvider("wss://rococo-contracts-rpc.polkadot.io");
    const api = new ApiPromise({ provider: wsProvider });
    await api.isReady;
    console.log("The api is ready.");
    setApi(api);

    formatBalance.setDefaults({ unit: 'ROC' });

    const contract = new ContractPromise(api,abi, CONTRACT_ADDRESS);
    const storageDepositLimit=null;

    //const gasLimit = api.registry.createType('WeightV2', { refTime: 3912368128, proofSize: 131072 });

    //const callValue = await contract.query.balanceOf(DEV_ACCOUNT_I_ADDRESS, { gasLimit: -1 }, DEV_ACCOUNT_II_ADDRESS);

    

    const callValue = await contract.query.totalSupply(DEV_ACCOUNT_I_ADDRESS, {
      gasLimit:api?.registry.createType('WeightV2', {
        refTime: MAX_CALL_WEIGHT,
        proofSize: PROOFSIZE,
      }) as WeightV2,
      storageDepositLimit,
    });

    if (callValue.result.isOk) {
      if(callValue.output!=null)
        console.log('Success', callValue.output.toHuman());
    } else {
      console.error('Error', callValue.result.asErr.toRawType());
    }
/*
    //console.log(callValue.result);
    console.log('BUUULLLCCCRRRAAAPPP');
    console.log(callValue.result.isOk.valueOf());
    console.log(callValue.result.asErr.isEmpty);
    console.log(callValue.result.asErr.toRawType());
    console.log('BUUULLLCCCRRRAAAPPP');
*/
  };

  const onClickConnection = async () => {
    const extensions=await web3Enable(NAME);

    if(!extensions){
      throw Error("No extensions");
    }
    
    const accountsList= await web3Accounts();

    setAccountsList(accountsList);

    if(accountsList.length===1)
    {
      console.log(accountsList);
    }    
  };
  
  const onChangeAddress = async (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    
    const address=accounts.find(
      (account)=> account.address=== value
    );

    setSelectedAccount(address);
  };

  const onClickTransaction = async () => {

    const toAddress = "5Ev7FnAcuNwoPRF1Txb5YvyjMCeuBaMh8tHzcMqGYrCa3ZFe";
    //The API interfaces, only deal with u128 values. "1,000,000,000,000"
    const AMOUNT = new BN(1).mul(new BN(10).pow(new BN(12)));

    if(!api) return;


    if(!selectedAccount) return;

    const injector= await web3FromAddress(selectedAccount.address);

    //Extrinsic call
    const txHash = await api.tx.balances.transfer(toAddress, AMOUNT)
    .signAndSend(selectedAccount.address,
      {
        signer:injector.signer
      }
      );

      console.log(txHash);
  };
  

  useEffect(()=>{
    setup();
    
  },[]);


  useEffect( () => {
    if(!api) return;

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions 
    (async () => {
      //State Queries
      const now = await api.query.timestamp.now();
      console.log(now.toPrimitive());

      const parachainId = await api.query.parachainInfo.parachainId();
      console.log("Parachain Id: " + parachainId.toPrimitive());

      //RPC calls
      const chainName = await api.rpc.system.chain();
      console.log("Chain Name: " + chainName.toPrimitive());
   
    })();

  },[api]);

  useEffect(() => {
    if(!api) return;

    if(!selectedAccount) return;

    api.query.system.account(selectedAccount.address,({data:{free}}:{data:{free:BN}})=>{
      setBalance(free)
    })

  },[api,selectedAccount]);


  return (
    <div style={styles.container}>
    {accounts.length === 0 ? (
      <button onClick={onClickConnection} style={styles.button}> Connect</button>
      ):null}

    {accounts.length>0 && !selectedAccount ? (
      <>
      <select onChange={onChangeAddress} defaultValue={'DEFAULT'} style={styles.select}>
      <option value="DEFAULT" disabled>
          Choose one
        </option>
        {accounts.map((account)=>(
        <option key={account.address} value={account.address}>{account.meta.name || account.address}</option>
        ))}
        </select>
      </>
    ):null}

     {selectedAccount ? <>
     <button onClick={onClickTransaction}>Transfer 0.05 ROC from {selectedAccount.address} to 5Ev7FnAcuNwoPRF1Txb5YvyjMCeuBaMh8tHzcMqGYrCa3ZFe</button>
     <span>Balance:{formatBalance(balance, { withSiFull: true })}</span>
     </> :null}

    </div>
  );
}

export default App;


const styles: { [name: string]: React.CSSProperties } = {
  container: {
    marginTop: 50,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  select: {
    padding: 5,
    width: 200,
  },
  result: {
    marginTop: 30,
  },
};