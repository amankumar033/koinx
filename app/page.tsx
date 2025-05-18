"use client"
import React, { useState, useEffect } from 'react';
import Image from 'next/image'
import { useMemo } from 'react';
import './globals.css';


interface Stcg {
  balance: number;
  gain: number;
}

interface Ltcg {
  balance: number;
  gain: number;
}

interface HoldingsData {
  id: number;
  coin: string;
  coinName: string;
  logo: string;
  currentPrice: number;
  totalHolding: number;
  averageBuyPrice: number;
  stcg: Stcg;
  ltcg: Ltcg;
}

interface CapitalGainsData {
  stcg: {
    profits: number;
    losses: number;
  };
  ltcg: {
    profits: number;
    losses: number;
  };
}

const page = () => {

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortedAssets, setSortedAssets] = useState<HoldingsData[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showWorking, setShowWorking] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const tableRef = React.useRef<HTMLDivElement>(null);
  const [holdings, setHoldings] = useState<HoldingsData[]>([]);
  const [capitalGains, setCapitalGains] = useState<CapitalGainsData | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedCoins, setSelectedCoins] = useState<string[]>([]);
  // Calculate adjusted losses and gains for after-harvesting table
  const {
    adjustedStcgLosses,
    adjustedLtcgLosses,
    newStcgNet,
    newLtcgNet,
    newTotalGains
  } = useMemo(() => {
    console.log('Recomputing gains with selectedCoins:', selectedCoins);

    let additionalStcgLoss = 0;
    let additionalLtcgLoss = 0;
    let additionalStcgProfit = 0;
    let additionalLtcgProfit = 0;

    selectedCoins.forEach((coinName) => {
      const asset = holdings.find((h) => h.coinName === coinName);
      if (asset) {
        const stcgGain = asset.stcg.gain;
        const ltcgGain = asset.ltcg.gain;

        if (stcgGain < 0) additionalStcgLoss += Math.abs(stcgGain);
        else additionalStcgProfit += stcgGain;

        if (ltcgGain < 0) additionalLtcgLoss += Math.abs(ltcgGain);
        else additionalLtcgProfit += ltcgGain;
      }
    });

    const adjustedStcgLosses = (capitalGains?.stcg.losses ?? 0) + additionalStcgLoss;
    const adjustedLtcgLosses = (capitalGains?.ltcg.losses ?? 0) + additionalLtcgLoss;

    const adjustedStcgProfits = (capitalGains?.stcg.profits ?? 0) + additionalStcgProfit;
    const adjustedLtcgProfits = (capitalGains?.ltcg.profits ?? 0) + additionalLtcgProfit;

    const newStcgNet = adjustedStcgProfits - adjustedStcgLosses;
    const newLtcgNet = adjustedLtcgProfits - adjustedLtcgLosses;
    const newTotalGains = newStcgNet + newLtcgNet;

    return {
      adjustedStcgLosses,
      adjustedLtcgLosses,
      newStcgNet,
      newLtcgNet,
      newTotalGains
    };
  }, [selectedCoins, holdings, capitalGains]);


  const toggleSelection = (coinName: string) => {
    setSelectedCoins(prev => {
      const updated = prev.includes(coinName)
        ? prev.filter(c => c !== coinName)
        : [...prev, coinName];
      console.log('Updated selectedCoins:', updated);
      return updated;
    });
  };
  function formatNumber(value: number): string {
    const absValue = Math.abs(value);

    // Format large numbers with suffixes
    if (absValue >= 1_000_000_000_000) return (value / 1_000_000_000_000).toFixed(1) + 'T';
    if (absValue >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B';
    if (absValue >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';

    // For all other numbers, always show 8 digits after decimal
    return value.toFixed(8);
  }

function scientificToDecimal(sci:Number) {
  const str = String(sci).toLowerCase();

  if (!str.includes('e')) return str;

  const [base, exponent] = str.split('e');
  const exp = Number(exponent);

  let [intPart, decPart = ''] = base.split('.');
  const numStr = intPart + decPart;
  const sign = str.startsWith('-') ? '-' : '';
  const absNumStr = numStr.replace('-', '');
  const decimalPos = intPart.replace('-', '').length;
  const finalPos = decimalPos + exp;

  if (exp >= 0) {
    const padded = absNumStr.padEnd(finalPos, '0');
    return sign + padded + (finalPos < absNumStr.length ? '.' + absNumStr.slice(finalPos) : '');
  } else {
    const zeros = '0'.repeat(Math.abs(finalPos));
    return sign + '0.' + zeros + absNumStr;
  }
}




  function formatedNumber(value: number): string {
    const str = value.toString();

    if (str.length <= 8) {
      return str;
    }
    if (value >= 1_000_000_000_000) return (value / 1_000_000_000_000).toFixed(1) + 'T';
    if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B';
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
    // if (value >= 10_000) return (value / 1_000).toFixed(1) + 'K';

    return str.slice(0, 9);
  }




  useEffect(() => {
    // Fetch Holdings Data
    fetch('/api/holdings')
      .then((res) => res.json())
      .then((data) => {
        setHoldings(data);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch('/api/capitalGains')
      .then((res) => res.json())
      .then((data) => {
        setCapitalGains(data.capitalGains); // ✅ Only set the nested object
      });
  }, []);


  useEffect(() => {
    if (holdings.length === 0) return; // Prevent sorting empty state

    const sorted = [...holdings].sort((a, b) => {
      const aValue = a.stcg.gain;
      const bValue = b.stcg.gain;
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    setSortedAssets(sorted);
  }, [holdings, sortOrder]);

  const realizedGains = ((capitalGains?.stcg?.profits ?? 0) - (capitalGains?.stcg?.losses ?? 0)) + ((capitalGains?.ltcg?.profits ?? 0) - (capitalGains?.ltcg?.losses ?? 0));
  const effectiveGains = newTotalGains;
  const savings =effectiveGains - realizedGains;

  return (
    <div 
      className={`bg-[#08090F] w-screen overflow-x-hidden transition-all duration-500  ${isExpanded ? 'max-h-full' : 'sm:h-screen z-10 relative'
        }`}
    >

      <div className='py-3 pl-2 sm:pl-15 bg-[#171A26] [box-shadow:0_0_12px_0_#1026490F] 
'>

        <Image
          className="dark:invert"
          src="/logo.png"
          alt="koinx logo"
          width={90}
          height={20}
        />
      </div>

      <section className=' text-sm sm:px-15 px-2 flex flex-col gap-3 font-[500] relative text-white'>
        <div className='mt-3 '>
          <h1 className='text-2xl font-[600]'>
            Tax Harvesting
            <span
              className="text-sm font-[500] ml-2 text-[#0052FE] relative cursor-pointer hover:underline"
              onMouseEnter={() => setShowWorking(true)}
              onMouseLeave={() => setShowWorking(false)}
            >
              How it works?
              {showWorking && (
                <div className="absolute left-1/2 mt-2  sm:w-90 w-60 p-3 bg-[#0F172A] rounded shadow-lg z-10 -translate-x-1/2">
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-[#0F172A]"></div>
                  <p className="text-sm text-white">
                    This is where you explain how tax harvesting works. You can put any content here. <span className='underline text-sm text-[#0052FE]'>Know more</span>
                  </p>
                </div>
              )}
            </span>
          </h1>

          <div
            className="pt-3 cursor-pointer"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className='border-2 rounded-lg border-[#0052FE] bg-[#121D3A] py-2'>
              <div className='flex items-center justify-between px-2'>
                <div className="flex items-center">
                  <img src="/Info.png" alt="" />
                  <h6 className='px-1 font-[600]'>Important Notes & Disclaimers</h6>
                </div>
                <svg
                  className={`w-4 h-4 transform transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>

              {isDropdownOpen && (
                <ul className="list-disc list-inside space-y-1 text-sm mt-2 font-[500] px-4">
                  <li>Tax-loss harvesting is currently not allowed under Indian tax regulations. Please consult your tax advisor before making any decisions.</li>
                  <li>Tax harvesting does not apply to derivatives or futures. These are handled separately as business income under tax rules.</li>
                  <li>Price and market value data is fetched from Coingecko, not from individual exchanges. As a result, values may slightly differ from the ones on your exchange.</li>
                  <li>Some countries do not have a short-term/long-term bifurcation. For now, we are calculating everything as long-term.</li>
                  <li>Only realized losses are considered for harvesting. Unrealized losses in held assets are not counted.</li>
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className='flex flex-col sm:flex-row gap-5  '>
          <div className='bg-[#171A26] py-2 px-4 text-white rounded-lg sm:w-1/2 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)] '>
            <h1 className='font-[600] text-lg'>Pre Harvesting</h1>
            <table className="min-w-full text-left">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left"></th>
                  <th className="py-2 text-left font-[500]">Short-term</th>
                  <th className="py-2 text-left font-[500]">Long-term</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2">Profit</td>
                  <td className="py-2">${capitalGains?.stcg?.profits}</td>
                  <td className="py-2">${capitalGains?.ltcg?.profits}</td>
                </tr>
                <tr>
                  <td className="py-2">Losses</td>
                  <td className="py-2">${capitalGains?.stcg?.losses}</td>
                  <td className="py-2">${capitalGains?.ltcg?.losses}</td>
                </tr>
                <tr>
                  <td className="py-2 font-[500]">Net Capital Gains</td>
                  <td className="py-2">${(capitalGains?.stcg?.profits ?? 0) - (capitalGains?.stcg?.losses ?? 0)}</td>
                  <td className="py-2">${(capitalGains?.ltcg?.profits ?? 0) - (capitalGains?.ltcg?.losses ?? 0)}</td>
                </tr>
              </tbody>
            </table>
            <div className="flex items-center mt-3 ">
              <h1 className="font-[600] text-lg">Realized Capital Gain:</h1>
              <span className="ml-5 font-[600] text-2xl">${((capitalGains?.stcg?.profits ?? 0) - (capitalGains?.stcg?.losses ?? 0)) + ((capitalGains?.ltcg?.profits ?? 0) - (capitalGains?.ltcg?.losses ?? 0))}</span>
            </div>
          </div>

          <div className='bg-[linear-gradient(to_right,#3C9AFF,#0066FE)] text-white py-2 px-4 rounded-lg sm:w-1/2 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)] '>
            <h1 className='font-[600] text-lg'>After Harvesting</h1>
            <table className="min-w-full text-left">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left"></th>
                  <th className="py-2 text-left font-[500]">Short-term</th>
                  <th className="py-2 text-left font-[500]">Long-term</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 text-sm">Profits</td>
                  <td className="py-2">${formatedNumber(newTotalGains)}</td>
                  <td className="py-2">${formatedNumber(capitalGains?.ltcg?.profits ?? 0)}</td>
                </tr>
                <tr>
                  <td className="py-2">Losses</td>
                  <td className="py-2">${formatedNumber(adjustedStcgLosses)}</td>
                  <td className="py-2">${formatedNumber(adjustedLtcgLosses)}</td>
                </tr>
                <tr>
                  <td className="py-2 font-[500]">Net Capital Gains</td>
                  <td className="py-2">${formatedNumber(newStcgNet)}</td>
                  <td className="py-2">${formatedNumber(newLtcgNet)}</td>
                </tr>
              </tbody>
            </table>
            <div className="flex items-center mt-3 mb-5">
              <h1 className="font-[600] text-lg">Effective Capital Gain:</h1>
              <span className="ml-5 font-[600] text-2xl">${formatedNumber(newTotalGains)}</span>
            </div>
            <div>
              {typeof savings === 'number' && savings 
              > 0 && (
                <h1>🎉 You are going to save up to ₹{formatNumber(savings)}</h1>
              )}


            </div>
          </div>
        </div>

        <div className=' bg-[#171A26]  rounded-lg shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)]'>
          <h1 className='text-xl pl-4 mt-1 '>Holdings</h1>
          <div
            className={`overflow-y-hidden transition-all duration-500 ${isExpanded ? 'max-h-full' : 'sm:max-h-[280px] max-h-[300px] z-10 relative'}`}
            ref={tableRef}
          >
            <div className="sm:scrollbar-hide  max-w-full pt-1 px-3">
              <table className="min-w-full rounded-lg overflow-y-hidden overflow-x-scroll ">
                <thead className="bg-[#0A0A12]">
                  <tr>
                    <th className="px-3 py-2 w-10 text-center">
                      <input
                        type="checkbox"
                        className="cursor-pointer"
                        checked={selectedCoins.length === sortedAssets.length}
                        onChange={() => {
                          if (selectedCoins.length === sortedAssets.length) {
                            setSelectedCoins([]); // Uncheck all
                          } else {
                            setSelectedCoins(sortedAssets.map((asset) => asset.coinName)); // Check all
                          }
                        }}
                      />


                    </th>
                    <th className="px-3 py-2 text-left font-[500]">Asset</th>
                    <th className="px-3 py-2 text-left font-[500]">Holding</th>
                    <th className="px-3 py-2 text-left font-[500]">Total Current Value</th>
                    <th
                      className="px-3 py-2 text-left font-[500] cursor-pointer select-none"
                      onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                    >
                      <div className="flex items-center gap-1">
                        Short Term
                        <span className="text-xs">
                          {sortOrder === 'asc' ? '▲' : '▼'}
                        </span>
                      </div>
                    </th>
                    <th
                      className="px-3 py-2 text-left font-[500] cursor-pointer select-none"
                      onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                    >
                      <div className="flex items-center gap-1">
                        Long Term
                        <span className="text-xs">
                          {sortOrder === 'asc' ? '▲' : '▼'}
                        </span>
                      </div>
                    </th>

                    <th className="px-3 py-2 text-left font-[500]">Amount to Sell</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAssets.map(asset => (
                    <tr
                      key={asset.id}
                      className={`${selectedCoins.includes(asset.coinName) ? 'bg-[#121D3A]' : ''
                        } border-b border-gray-200 hover:bg-[#121D3A] transition-colors items-center`}
                    >

                      {/* Checkbox */}
                      <td className="text-center px-3 py-2 ">

                        <input
                          type="checkbox"
                          className="cursor-pointer"
                          checked={selectedCoins.includes(asset.coinName)}
                          onChange={() => toggleSelection(asset.coinName)}
                        />
                      </td>

                      {/* Asset */}
                      <td className="px-3 py-2 flex items-center gap-3 font-medium sm:mt-0 mt-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold `}>
                          <img src={asset.logo} alt="" />
                        </div>
                        <div>
                          <div >
                            {asset.coinName.length > 13
                              ? `${asset.coinName.slice(0, 13)}...`
                              : asset.coinName}
                          </div>
                          <div className='text-xxs font-normal'>{asset.coin}
                          </div>
                        </div>
                      </td>

                      {/* Holding */}
                      <td className="px-3 py-2">
                        <div className="flex flex-col leading-none ">
                          <div className="text-sm">
                            {asset.totalHolding.toString().length > 8
                              ? `${asset.totalHolding.toString().slice(0, 8)}`
                              : asset.totalHolding}
                            <span className="text-sm ml-1">{asset.coin}</span>
                          </div>
                          <div className="mt-0">
                            <span className="text-xxs font-normal">
                              $ {asset.averageBuyPrice.toString().length > 8
                                ? `${asset.averageBuyPrice.toString().slice(0, 8)}`
                                : asset.averageBuyPrice} /{asset.coin}
                            </span>
                          </div>
                        </div>
                      </td>
                      {/* Current Price */}
                      <td className="px-3 py-2 font-medium">$ {asset.currentPrice.toString().length > 8
                        ? `${asset.currentPrice.toString().slice(0, 8)}`
                        : asset.currentPrice}</td>

                      {/* Short Term with Tooltip */}
                      <td className="relative group px-3 py-2 cursor-default">
                        <div className="flex flex-col items-start">
                          <span
                            className={`text-sm font-semibold relative inline-block group-hover:underline ${asset.stcg.gain < 0 ? 'text-red-500' : 'text-green-400'
                              }`}
                          >
                            $ {formatNumber(asset.stcg.gain)}
                            <div className="absolute left-1/2 bottom-full transform -translate-x-1/2 mb-0 w-auto p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
                              <div className="flex flex-col items-start w-full">
                                <span className="flex justify-center font-semibold w-auto">${scientificToDecimal(asset.stcg.gain)}</span>

                              </div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-6 border-l-transparent border-r-6 border-r-transparent border-t-6 border-gray-800"></div>
                            </div>
                          </span>
                          <span className="text-xxs text-gray-500">{formatNumber(asset.stcg.gain)} {asset.coin}</span>
                        </div>
                      </td>

                      {/* Long Term with Tooltip */}
                      <td className="relative group px-3 py-2 cursor-default">
                        <div className="flex flex-col items-start">
                          <span className={`text-sm font-semibold relative inline-block group-hover:underline  ${asset.stcg.gain < 0 ? 'text-red-500' : 'text-green-400'
                            }`}>
                            {asset.ltcg.gain}
                            <div>
                              <span className='text-xxs'>{asset.ltcg.balance} {asset.coin}</span></div>
                            <div className="absolute left-1/2 bottom-full transform -translate-x-1/2 mb-0 w-36 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
                              <div className="flex flex-col items-start">


                              </div>
                              <span className="flex justify-center font-semibold">{asset.ltcg.balance}</span>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-6 border-l-transparent border-r-6 border-r-transparent border-t-6 border-gray-800"></div>
                            </div>
                          </span>
                          {/* <span className="text-xs text-gray-500">{asset.longTermSmall}</span> */}
                        </div>
                      </td>

                      {/* Amount to Sell */}
                      <td className="px-3 py-2 font-medium">
                        {selectedCoins.includes(asset.coinName) ? formatNumber(asset.totalHolding) : '-'}
                      </td>

                    </tr>
                  ))}
                </tbody>


              </table>
            </div>

          </div>

          <div className="relative bg[#171A26] ">
            <div className={`${isExpanded ? 'relative mt-4' : 'relative'} bottom-1 left-7 z-10 flex `}>

              <button
                onClick={() => {
                  setIsExpanded(prev => !prev);

                  if (isExpanded) {
                    // Scroll to top of the table when collapsing
                    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } else {
                    // Scroll to full bottom of the page when expanding
                    setTimeout(() => {
                      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    }, 300); // delay to allow expansion animation
                  }
                }}
              >
                <span className="text-[#0052FE]">{isExpanded ? 'View Less' : 'View All'}</span>
                <img
                  src={isExpanded ? '/Viewall.png' : '/viewall.png'}

                  className="w-1 h-1 "
                />
              </button>
            </div>


          </div>
        </div>

      </section>
    </div>
  );
};

export default page;
