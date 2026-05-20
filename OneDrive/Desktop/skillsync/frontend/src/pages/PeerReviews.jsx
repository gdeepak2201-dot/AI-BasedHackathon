import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Star, Users, Plus, Check } from 'lucide-react';
import { peerReviewsAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const scoreLabels = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'];

function StarRating({ value, onChange, label }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600 dark:text-slate-400 w-40">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} type="button" onClick={() => onChange(star)} className={clsx('w-8 h-8 rounded-lg transition-all', star <= value ? 'bg-amber-400 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-amber-100')}>
            <Star size={14} className="mx-auto" fill={star <= value ? 'currentColor' : 'none'} />
          </button>
        ))}
        <span className="text-xs text-slate-400 ml-2 w-20">{scoreLabels[value] || ''}</span>
      </div>
    </div>
  );
}

export default function PeerReviews() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [scores, setScores] = useState({ communicationScore: 3, leadershipScore: 3, collaborationScore: 3, technicalScore: 3, reliabilityScore: 3 });
  const [feedback, setFeedback] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const { data: myReviews } = useQuery('my-reviews', () => peerReviewsAPI.myReviews().then(r => r.data));
  const { data: pendingReviews } = useQuery('pending-reviews', () => peerReviewsAPI.pending().then(r => r.data));

  const submitMutation = useMutation(
    (data) => peerReviewsAPI.submit(data),
    {
      onSuccess: () => {
        toast.success('Review submitted successfully');
        queryClient.invalidateQueries('pending-reviews');
        queryClient.invalidateQueries('my-reviews');
        setShowForm(false);
        setSelectedPeer(null);
        setScores({ communicationScore: 3, leadershipScore: 3, collaborationScore: 3, technicalScore: 3, reliabilityScore: 3 });
        setFeedback('');
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Failed to submit review')
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPeer) return toast.error('Select a peer to review');
    submitMutation.mutate({
      revieweeId: selectedPeer.id,
      projectId: selectedPeer.project_id,
      ...scores,
      feedback,
      isAnonymous
    });
  };

  const averages = myReviews?.averages;
  const reviews = myReviews?.reviews || [];
  const pending = pendingReviews?.pendingReviews || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Star className="text-amber-500" size={24} />
            Peer Reviews
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Give and receive feedback from your teammates</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus size={16} /> Write Review
        </button>
      </div>

      {/* Review form */}
      {showForm && (
        <div className="glass-card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Submit Peer Review</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Teammate</label>
              <div className="flex flex-wrap gap-2">
                {pending.map(peer => (
                  <button
                    key={`${peer.id}-${peer.project_id}`}
                    type="button"
                    onClick={() => setSelectedPeer(peer)}
                    className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all border', selectedPeer?.id === peer.id && selectedPeer?.project_id === peer.project_id ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary-300')}
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                      {peer.first_name?.[0]}
                    </div>
                    {peer.first_name} {peer.last_name}
                    <span className="text-xs text-slate-400">({peer.project_title})</span>
                  </button>
                ))}
                {pending.length === 0 && <p className="text-sm text-slate-400">No pending reviews at this time</p>}
              </div>
            </div>

            <div className="space-y-3">
              <StarRating label="Communication" value={scores.communicationScore} onChange={v => setScores({ ...scores, communicationScore: v })} />
              <StarRating label="Leadership" value={scores.leadershipScore} onChange={v => setScores({ ...scores, leadershipScore: v })} />
              <StarRating label="Collaboration" value={scores.collaborationScore} onChange={v => setScores({ ...scores, collaborationScore: v })} />
              <StarRating label="Technical Contribution" value={scores.technicalScore} onChange={v => setScores({ ...scores, technicalScore: v })} />
              <StarRating label="Reliability" value={scores.reliabilityScore} onChange={v => setScores({ ...scores, reliabilityScore: v })} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Written Feedback</label>
              <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3} placeholder="Share specific observations about your teammate's contributions..." className="input resize-none" />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="rounded" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Submit anonymously</span>
            </label>

            <div className="flex gap-3">
              <button type="submit" disabled={submitMutation.isLoading || !selectedPeer} className="btn-primary">
                {submitMutation.isLoading ? 'Submitting...' : 'Submit Review'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* My review scores */}
      {averages && parseInt(averages.total_reviews) > 0 && (
        <div className="glass-card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">My Review Scores ({averages.total_reviews} reviews)</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Communication', value: averages.avg_communication },
              { label: 'Leadership', value: averages.avg_leadership },
              { label: 'Collaboration', value: averages.avg_collaboration },
              { label: 'Technical', value: averages.avg_technical },
              { label: 'Reliability', value: averages.avg_reliability }
            ].map((score, i) => (
              <div key={i} className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{parseFloat(score.value || 0).toFixed(1)}</div>
                <div className="flex justify-center gap-0.5 my-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={10} className={s <= Math.round(score.value) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} />
                  ))}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{score.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent reviews received */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">Reviews Received</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {reviews.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Star size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No reviews received yet</p>
            </div>
          ) : (
            reviews.slice(0, 5).map(review => (
              <div key={review.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{review.reviewer_name}</p>
                    <p className="text-xs text-slate-400">{review.project_title} • {format(new Date(review.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star size={14} className="text-amber-400 fill-amber-400" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {parseFloat(review.scores?.communication || 0 + review.scores?.leadership || 0 + review.scores?.collaboration || 0 + review.scores?.technical || 0 + review.scores?.reliability || 0) / 5 || 0}
                    </span>
                  </div>
                </div>
                {review.feedback && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 italic">"{review.feedback}"</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
