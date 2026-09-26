import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, User } from 'lucide-react';
import api from '../../services/api';
import { ReviewsListSkeleton } from '../common/Skeletons';

export default function HotelReviewsList({ hotelId }) {
  const [reviewsData, setReviewsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hotelId) return;

    let isMounted = true;
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/reviews/hotel/${hotelId}`);
        if (isMounted && res.data.success) {
          setReviewsData(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching hotel reviews:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, [hotelId]);

  if (loading) {
    return <ReviewsListSkeleton count={3} />;
  }

  const reviews = reviewsData?.reviews || [];
  const avgRating = reviewsData?.average_rating;
  const reviewCount = reviewsData?.review_count || 0;

  return (
    <div className="space-y-4 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <h4 className="text-sm font-bold text-slate-800">Verified Guest Reviews</h4>
        </div>
        {avgRating && (
          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full text-xs font-semibold border border-amber-200">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{avgRating} / 5</span>
            <span className="text-amber-600/70 font-normal">({reviewCount} review{reviewCount !== 1 ? 's' : ''})</span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="p-4 bg-slate-50 rounded-2xl text-center text-slate-400 text-xs">
          No user reviews yet for this hotel. Be the first to share your experience after completing your stay!
        </div>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                    {rev.user?.name ? rev.user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-semibold text-slate-800">
                    {rev.user?.name || 'Verified Traveler'}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < rev.rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {rev.comment && (
                <p className="text-xs text-slate-600 leading-relaxed pl-8">
                  "{rev.comment}"
                </p>
              )}

              <span className="text-[10px] text-slate-400 block pl-8">
                {new Date(rev.created_at).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
