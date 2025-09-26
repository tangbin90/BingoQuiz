import React from 'react';
import { LeaderboardItem } from '../types';

interface LeaderboardProps {
  items: LeaderboardItem[];
  currentUserId?: string;
  maxItems?: number;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ 
  items, 
  currentUserId, 
  maxItems = 10 
}) => {
  const displayItems = items.slice(0, maxItems);
  const currentUserRank = items.findIndex(item => item.userId === currentUserId) + 1;

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Leaderboard
      </h3>
      
      {displayItems.length === 0 ? (
        <div className="text-center text-gray-500 py-4">
          No participants yet
        </div>
      ) : (
        <div className="space-y-2">
          {displayItems.map((item, index) => {
            const isCurrentUser = item.userId === currentUserId;
            const rank = index + 1;
            
            return (
              <div
                key={item.userId}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isCurrentUser 
                    ? 'bg-primary-50 border-2 border-primary-200' 
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                    rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                    rank === 2 ? 'bg-gray-100 text-gray-800' :
                    rank === 3 ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {rank}
                  </div>
                  <div>
                    <div className={`font-medium ${isCurrentUser ? 'text-primary-700' : 'text-gray-700'}`}>
                      {item.name}
                      {isCurrentUser && <span className="ml-2 text-xs text-primary-600">(You)</span>}
                    </div>
                  </div>
                </div>
                <div className={`text-lg font-bold ${
                  isCurrentUser ? 'text-primary-600' : 'text-gray-600'
                }`}>
                  {item.score}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {currentUserId && currentUserRank > maxItems && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="text-sm text-gray-600 text-center">
            Your rank: #{currentUserRank}
          </div>
        </div>
      )}
    </div>
  );
};
