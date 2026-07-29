import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

interface Props {
  history: { date: string; price: number }[];
  currentPrice: number;
}

export const PriceChart: React.FC<Props> = ({ history, currentPrice }) => {
  const screenWidth = Dimensions.get('window').width - 32;

  const labels = history.map(h => h.date);
  const data = history.map(h => h.price);

  // Fallback if data is insufficient
  const chartLabels = labels.length > 0 ? labels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const chartData = data.length > 0 ? data : [20, 22, 21, 24, 23, 26, currentPrice];

  const firstPrice = chartData[0];
  const lastPrice = chartData[chartData.length - 1];
  const delta = Math.round((lastPrice - firstPrice) * 10) / 10;
  const deltaPercent = firstPrice > 0 ? Math.round(((lastPrice - firstPrice) / firstPrice) * 1000) / 10 : 0;
  const isPositive = delta >= 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Stock Price History (7 Days)</Text>
          <Text style={styles.currentPrice}>🪙 {currentPrice} Coins/Share</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: isPositive ? 'rgba(20, 184, 166, 0.2)' : 'rgba(255, 107, 107, 0.2)' }]}>
          <Text style={[styles.badgeText, { color: isPositive ? '#14B8A6' : '#FF6B6B' }]}>
            {isPositive ? '▲' : '▼'} {isPositive ? `+${delta}` : delta} ({deltaPercent}%)
          </Text>
        </View>
      </View>

      <LineChart
        data={{
          labels: chartLabels,
          datasets: [{ data: chartData }],
        }}
        width={screenWidth}
        height={180}
        chartConfig={{
          backgroundColor: '#1A1D2E',
          backgroundGradientFrom: '#1A1D2E',
          backgroundGradientTo: '#1A1D2E',
          decimalPlaces: 1,
          color: (opacity = 1) => isPositive ? `rgba(20, 184, 166, ${opacity})` : `rgba(255, 107, 107, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: isPositive ? '#14B8A6' : '#FF6B6B',
          },
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1D2E',
    borderRadius: 16,
    padding: 14,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  currentPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F55',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chart: {
    borderRadius: 12,
    marginRight: -10,
  },
});
