import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useHealthStore } from '../store/useHealthStore';
import HistoricalAnalysis from './HistoricalAnalysis';

const CalendarView = () => {
    const user = useHealthStore((state) => state.user);
    const history = user?.history || [];

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedRecord, setSelectedRecord] = useState(null);

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    // Helper to check if a day has a record
    const getRecordForDay = (day) => {
        return history.find(h => {
            const hDate = new Date(h.date);
            return hDate.getDate() === day &&
                hDate.getMonth() === currentDate.getMonth() &&
                hDate.getFullYear() === currentDate.getFullYear();
        });
    };

    const handleDayClick = (record) => {
        if (record) {
            setSelectedRecord(record);
        }
    };

    return (
        <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100 h-full relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <CalendarIcon size={20} className="text-blue-500" />
                    History
                </h3>
                <div className="flex gap-2">
                    <button className="p-1 hover:bg-slate-100 rounded-full"><ChevronLeft size={20} /></button>
                    <span className="text-sm font-medium text-slate-600">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <button className="p-1 hover:bg-slate-100 rounded-full"><ChevronRight size={20} /></button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                    <div key={d} className="text-xs font-bold text-slate-400">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const record = getRecordForDay(day);
                    const isActive = !!record;

                    return (
                        <motion.button
                            key={day}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDayClick(record)}
                            className={`aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-colors relative
                                ${isActive
                                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30 cursor-pointer'
                                    : 'text-slate-600 hover:bg-slate-50 cursor-default'}`}
                        >
                            {day}
                            {isActive && (
                                <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full opacity-50"></div>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 text-center">
                    Select a highlighted date to view past assessment details.
                </p>
            </div>

            {/* Detail Popup Overlay */}
            <AnimatePresence>
                {selectedRecord && (
                    <HistoricalAnalysis
                        record={selectedRecord}
                        onClose={() => setSelectedRecord(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default CalendarView;
