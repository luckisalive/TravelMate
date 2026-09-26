import React, { useState } from 'react';
import { Star, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function ReviewModal({ isOpen, onClose, booking, onReviewSubmitted }) {
  const toast = useToast();
  if (!isOpen || !booking) return null;

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const title = booking.hotel?.name || (booking.transport ? `${booking.transport.operator} ${booking.transport.number}` : 'Your Reservation');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Please select a star rating between 1 and 5.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/reviews', {
        booking_id: booking.id,
        rating,
        comment,
      });

      if (res.data.success) {
        setSuccess(true);
        toast.success('Review published! Thank you for sharing your feedback.');
        setTimeout(() => {
          if (onReviewSubmitted) onReviewSubmitted(res.data.data);
          onClose();
        }, 1200);
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to submit review. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Rate & Review</h3>
            <p className="text-amber-100 text-xs truncate max-w-[280px]">
              {title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-amber-100 hover:text-white p-1 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        {success ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 animate-bounce" />
            <h4 className="text-slate-900 font-bold text-base mb-1">Review Published!</h4>
            <p className="text-slate-500 text-xs">
              Thank you for sharing your experience with the TravelMate community.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Star Rating Selector */}
            <div className="text-center">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Your Rating
              </label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 text-slate-300 hover:scale-125 transition-transform focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        (hoverRating || rating) >= star
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-medium text-slate-500 mt-1 block">
                {rating === 5 && 'Outstanding Experience (5★)'}
                {rating === 4 && 'Very Good (4★)'}
                {rating === 3 && 'Average / Good (3★)'}
                {rating === 2 && 'Needs Improvement (2★)'}
                {rating === 1 && 'Disappointing (1★)'}
              </span>
            </div>

            {/* Comment Area */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Review Comments (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share highlights of your stay, cleanliness, location convenience, or transit punctuality..."
                rows={4}
                className="w-full text-xs text-slate-800 p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Submit Review
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
