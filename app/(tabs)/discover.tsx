import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  SafeAreaView 
} from 'react-native';
import { searchArtists, SpotifyArtist } from '../../lib/spotify';
import { ArtistCard } from '../../components/ArtistCard';

const BADGE_FILTERS = [
  { id: 'all', label: 'All Artists' },
  { id: 'underground', label: 'Underground' },
  { id: 'rising_star', label: 'Rising Star' },
];

export default function DiscoverScreen() {
  const [query, setQuery] = useState('');
  const [allResults, setAllResults] = useState<SpotifyArtist[]>([]);
  const [visibleCount, setVisibleCount] = useState(30);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const fetchResults = async (searchTerm: string, category: string) => {
    setLoading(true);
    try {
      const data = await searchArtists(searchTerm, category);
      setAllResults(data);
      setVisibleCount(30); // Reset page count on filter or query change
    } catch (err) {
      console.error('Discover search error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults(query, selectedFilter);
  }, [selectedFilter]);

  const onQueryChange = (text: string) => {
    setQuery(text);
    fetchResults(text, selectedFilter);
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 30);
  };

  const displayedArtists = allResults.slice(0, visibleCount);
  const hasMore = visibleCount < allResults.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover Artists</Text>
        <Text style={styles.subtitle}>
          Sorted by price · {allResults.length > 0 ? `${Math.min(visibleCount, allResults.length)} of ${allResults.length.toLocaleString()}` : 0} artists
        </Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by artist name or genre..."
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={onQueryChange}
          autoCapitalize="none"
        />
        {query ? (
          <TouchableOpacity onPress={() => onQueryChange('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category Filter Chips */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={BADGE_FILTERS}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const isSelected = selectedFilter === item.id;
            return (
              <TouchableOpacity
                style={[styles.chip, isSelected && styles.selectedChip]}
                onPress={() => setSelectedFilter(item.id)}
              >
                <Text style={[styles.chipText, isSelected && styles.selectedChipText]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        />
      </View>

      {/* Results List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Filtering artists...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedArtists}
          keyExtractor={(item, index) => item.id || `art-${index}`}
          renderItem={({ item }) => <ArtistCard artist={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No artists found matching "{query}"</Text>
            </View>
          }
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity 
                style={styles.loadMoreBtn} 
                activeOpacity={0.8} 
                onPress={handleLoadMore}
              >
                <Text style={styles.loadMoreText}>
                  Load More Artists ({allResults.length - visibleCount} remaining)
                </Text>
              </TouchableOpacity>
            ) : allResults.length > 0 ? (
              <View style={styles.endOfList}>
                <Text style={styles.endOfListText}>All {allResults.length.toLocaleString()} artists displayed</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1119',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#F5F5F5',
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1D2E',
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  searchInput: {
    flex: 1,
    color: '#F5F5F5',
    fontSize: 14,
  },
  clearIcon: {
    color: '#9CA3AF',
    fontSize: 16,
    paddingHorizontal: 4,
  },
  filtersContainer: {
    marginBottom: 12,
    maxHeight: 36,
  },
  chip: {
    backgroundColor: '#1A1D2E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  selectedChip: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  chipText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedChipText: {
    color: '#0F1119',
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 10,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  loadMoreBtn: {
    backgroundColor: '#1A1D2E',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 16,
  },
  loadMoreText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '800',
  },
  endOfList: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  endOfListText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
