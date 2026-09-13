import React from 'react';
import { AlertTriangle, LogIn } from 'lucide-react';
import { useAuth } from 'react-oidc-context';
import { useHealthStore } from '../store/useHealthStore';

/**
 * Shown only when the assessment-history request failed.
 *
 * Without this, a failed history request was indistinguishable from a user who has
 * never run an assessment: both produced an empty list and no message. An empty
 * list must mean the user genuinely has no assessments, so every failure has to say
 * so out loud.
 */
const HistoryStatusBanner = () => {
    const historyError = useHealthStore((state) => state.historyError);
    const auth = useAuth();

    if (!historyError) return null;

    const isExpired = historyError === 'expired';

    return (
        <div
            role="alert"
            className={`mb-6 flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 rounded-2xl border shadow-sm ${
                isExpired
                    ? 'bg-rose-50 border-rose-100 text-rose-800'
                    : 'bg-amber-50 border-amber-100 text-amber-800'
            }`}
        >
            <AlertTriangle size={20} className="shrink-0" />

            <p className="text-sm font-medium flex-1">
                {isExpired
                    ? 'Your session has expired, so your assessment history could not be loaded. Sign in again to see it.'
                    : 'Your assessment history could not be loaded. This list may be incomplete. Please try again in a moment.'}
            </p>

            {isExpired && (
                <button
                    onClick={() => auth.signinRedirect()}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-colors shrink-0"
                >
                    <LogIn size={16} />
                    Sign in again
                </button>
            )}
        </div>
    );
};

export default HistoryStatusBanner;
