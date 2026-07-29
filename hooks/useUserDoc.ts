import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { getUserDoc, createUserDoc, UserProfile } from '../lib/firestore';

export function useUserDoc() {
  const { user, isLoaded: isClerkLoaded, isSignedIn } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function syncUser() {
      if (!isClerkLoaded) return;
      if (!isSignedIn || !user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let userDoc = await getUserDoc(user.id);
        if (!userDoc) {
          const primaryEmail = user.primaryEmailAddress?.emailAddress || 'user@example.com';
          const fullName = user.fullName || user.username || primaryEmail.split('@')[0];
          userDoc = await createUserDoc(user.id, primaryEmail, fullName);
        }
        setProfile(userDoc);
      } catch (err) {
        console.error('Error syncing user profile:', err);
        // Fallback local profile if Firestore fails
        setProfile({
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          name: user.fullName || 'User',
          coins: 1000,
          createdAt: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    }

    syncUser();
  }, [user, isClerkLoaded, isSignedIn]);

  const updateCoinsLocally = (newCoins: number) => {
    setProfile(prev => prev ? { ...prev, coins: newCoins } : null);
  };

  return {
    user,
    profile,
    loading: loading || !isClerkLoaded,
    isSignedIn,
    updateCoinsLocally,
  };
}
