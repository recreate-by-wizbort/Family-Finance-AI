/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Header from './components/Header';
import SearchBar from './components/SearchBar';
import FilterChips from './components/FilterChips';
import SpendingSummary from './components/SpendingSummary';
import CategoryList from './components/CategoryList';
import TransactionList from './components/TransactionList';

export default function App() {
  return (
    <div className="min-h-screen bg-black text-white font-sans flex justify-center">
      <div className="w-full max-w-md bg-[#1c1c1e] min-h-screen flex flex-col relative overflow-hidden shadow-2xl">
        <Header />
        <div className="flex-1 overflow-y-auto pb-10">
          <div className="px-4 py-2">
            <SearchBar />
          </div>
          <div className="px-4 py-2">
            <FilterChips />
          </div>
          <div className="px-4 py-4">
            <SpendingSummary />
          </div>
          <div className="px-4 py-2">
            <CategoryList />
          </div>
          <div className="px-4 py-4 mt-2">
            <TransactionList />
          </div>
        </div>
      </div>
    </div>
  );
}
