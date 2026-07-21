
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  X, 
  ShieldCheck, 
  Award, 
  Trophy, 
  Zap, 
  Loader2,
  MessageSquare,
  User
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { escrowService } from '@/lib/services/escrow-service';
import type { Review } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ReviewBottomSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

/**
 * PROOF OF REPUTATION BOTTOM SHEET
 * Version: 1.0.0
 */
export default function ReviewBottomSheet({ isOpen, onOpenChange, userId, userName }: ReviewBottomSheetProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ average: 0, count: 0, tier: 1 });

  useEffect(() => {
    if (isOpen && userId) {
      async function load() {
        setLoading(true);
        const [reviewData, ratingData] = await Promise.all([
          escrowService.fetchReviewsForUser(userId),
          escrowService.fetchUserRating(userId)
        ]);
        setReviews(reviewData);
        setStats(ratingData);
        setLoading(false);
      }
      load();
    }
  }, [isOpen, userId]);

  const distribution = Array(5).fill(0).map((_, i) => {
    const star = 5 - i;
    const count = reviews.filter(r => r.rating === star).length;
    return { star, percentage: stats.count > 0 ? (count / stats.count) * 100 : 0 };
  });

  const getTierInfo = (tier: number) => {
    switch (tier) {
      case 4: return { label: 'Market Legend', icon: Trophy, color: 'text-primary' };
      case 3: return { label: 'Registry Veteran', icon: Award, color: 'text-zinc-400' };
      case 2: return { label: 'Verified Trader', icon: ShieldCheck, color: 'text-blue-400' };
      default: return { label: 'New Node', icon: Zap, color: 'text-amber-500' };
    }
  };

  const tier = getTierInfo(stats.tier);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-[#0a0a0c] border-t border-primary/20 rounded-t-[3rem] p-0 h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-black/80 -z-10" />
        <div className="w-12 h-1 bg-white/10 rounded-full mx-auto my-4 shrink-0" />
        
        <SheetHeader className="px-8 mb-6 shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <SheetTitle className="text-2xl font-black uppercase tracking-tight text-white">Proof of Reputation</SheetTitle>
              <SheetDescription className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">
                Institutional Trust Ledger for @{userName}
              </SheetDescription>
            </div>
            <div className={cn("flex flex-col items-center gap-1", tier.color)}>
              <tier.icon className="w-6 h-6" />
              <span className="text-[8px] font-black uppercase tracking-widest">{tier.label}</span>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-8 pb-32 thin-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest">Auditing Registry...</p>
            </div>
          ) : (
            <div className="space-y-10">
              {/* SCOREBOARD NODE */}
              <section className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 flex gap-8 items-center shadow-xl">
                <div className="text-center space-y-1">
                  <h3 className="text-5xl font-black text-white leading-none">{stats.average.toFixed(1)}</h3>
                  <div className="flex items-center justify-center gap-0.5 text-primary">
                    {Array(5).fill(0).map((_, i) => (
                      <Star key={i} className={cn("w-3 h-3 fill-current", i >= Math.floor(stats.average) && "opacity-20")} />
                    ))}
                  </div>
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">{stats.count} Handshakes</p>
                </div>

                <div className="flex-1 space-y-2">
                  {distribution.map((d) => (
                    <div key={d.star} className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-white/40 w-2">{d.star}</span>
                      <Progress value={d.percentage} className="h-1 bg-white/5" />
                    </div>
                  ))}
                </div>
              </section>

              {/* HANDSHAKE FEED */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Verified Feedback</h4>
                </div>

                <div className="space-y-3">
                  {reviews.length > 0 ? reviews.map((review, i) => (
                    <motion.div 
                      key={review.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 rounded-xl border border-white/10">
                            <AvatarImage src={review.reviewer?.photo_url} />
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black">{review.reviewer?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-[11px] font-black text-white uppercase tracking-tight">@{review.reviewer?.name}</p>
                            <p className="text-[7px] font-bold text-white/20 uppercase">{new Date(review.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 text-primary">
                          {Array(5).fill(0).map((_, i) => (
                            <Star key={i} className={cn("w-2.5 h-2.5 fill-current", i >= review.rating && "opacity-20")} />
                          ))}
                        </div>
                      </div>
                      
                      {review.comment && (
                        <p className="text-xs text-muted-foreground leading-relaxed font-medium italic">
                          "{review.comment}"
                        </p>
                      )}
                    </motion.div>
                  )) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest">No feedback registered yet</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="p-8 shrink-0 bg-black/40 border-t border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-center gap-2 opacity-20">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
            <span className="text-[8px] font-black uppercase tracking-widest text-white">Registry Protocol v15.0 Authenticated</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
