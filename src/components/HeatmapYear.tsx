import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ContributionDay } from '../types';

interface HeatmapYearProps {
  year: number;
  contributions: ContributionDay[];
}

const HeatmapYear: React.FC<HeatmapYearProps> = ({ year, contributions }) => {
  const { getColor, maxCount } = useMemo(() => {
    // Find the maximum contribution count
    const max = Math.max(...contributions.map(day => day.contributionCount));
    
    // Create color bands based on the maximum value
    const getColorBand = (count: number) => {
      if (count === 0) return 'bg-gray-800';
      
      // Calculate percentage of max
      const percentage = count / max;
      
      if (percentage <= 0.2) return 'bg-green-900';
      if (percentage <= 0.4) return 'bg-green-700';
      if (percentage <= 0.7) return 'bg-green-500';
      return 'bg-green-300';
    };

    return {
      getColor: getColorBand,
      maxCount: max
    };
  }, [contributions]);

  const weeks = [];
  let currentWeek: ContributionDay[] = [];
  const today = new Date();
  const isCurrentYear = year === today.getFullYear();

  // Create a map for quick lookup of contribution counts
  const contributionMap = new Map(
    contributions.map(day => [day.date, day.contributionCount])
  );

  // Generate all dates for the year up to today
  let currentDate = new Date(year, 0, 1);
  const endDate = isCurrentYear ? today : new Date(year, 11, 31);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    currentWeek.push({
      date: dateStr,
      contributionCount: contributionMap.get(dateStr) || 0
    });

    if (currentWeek.length === 7 || currentDate >= endDate) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return (
    <div className="mb-8 overflow-x-auto">
      <div className="flex items-center mb-2 min-w-[320px]">
        <h3 className="text-lg font-semibold text-white mr-4">{year}</h3>
        <div className="flex-1 h-px bg-gray-700"></div>
        <div className="ml-4 text-xs text-gray-400">
          Max: {maxCount} contributions/day
        </div>
      </div>
      <div className="flex">
        <div className="grid grid-cols-[repeat(53,_minmax(4px,_1fr))] gap-[1px] w-full min-w-[320px]">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-rows-7 gap-[1px]">
              {week.map((day, dayIndex) => (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`aspect-square w-full min-w-[4px] min-h-[4px] rounded-[1px] ${getColor(day.contributionCount)} relative group cursor-default`}
                >
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-xs text-white rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none transition-opacity">
                    {format(parseISO(day.date), 'MMM d, yyyy')}: {day.contributionCount} contributions
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeatmapYear;