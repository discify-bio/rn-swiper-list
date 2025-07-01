import React, { useState, useRef } from 'react'
import { View, Text, StyleSheet, Button, SafeAreaView, ActivityIndicator } from 'react-native'
import { Swiper } from '../index'
import type { SwiperCardRefType } from '../index'

// Example of a large dataset
const generateLargeDataset = (size: number) => {
  return Array(size).fill(null).map((_, index) => ({
    id: `item-${index}`,
    text: `Card ${index}`,
    color: `hsl(${index * 10 % 360}, 70%, 80%)`
  }))
}

const LARGE_DATASET = generateLargeDataset(500) // 500 items

const ChunkingExample = () => {
  const [loading, setLoading] = useState(false)
  const [currentChunk, setCurrentChunk] = useState(0)
  const swiperRef = useRef<SwiperCardRefType>(null)

  // Simulate loading when changing chunks
  const handleChunkChange = (chunkIndex: number) => {
    setCurrentChunk(chunkIndex)
    setLoading(true)
    
    // Simulate network request delay
    setTimeout(() => {
      setLoading(false)
    }, 300)
  }

  const renderCard = (item: typeof LARGE_DATASET[0], index: number) => {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: item.color }
        ]}
      >
        <Text style={styles.text}>{item.text}</Text>
        <Text style={styles.subText}>Index: {index}</Text>
        <Text style={styles.subText}>In chunk: {Math.floor(index / 20)}</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chunking Example</Text>
        <Text>Current Chunk: {currentChunk}</Text>
        {loading && <ActivityIndicator style={styles.loader} />}
      </View>
      
      <View style={styles.swiperContainer}>
        <Swiper
          ref={swiperRef}
          data={LARGE_DATASET}
          renderCard={renderCard}
          useChunks={true}
          chunkSize={20}
          preloadChunks={1}
          onChunkChange={handleChunkChange}
          cardStyle={styles.cardContainer}
        />
      </View>
      
      <View style={styles.controlsContainer}>
        <Button 
          title='Swipe Left'
          onPress={() => swiperRef.current?.swipeLeft()}
        />
        <Button 
          title='Swipe Right'
          onPress={() => swiperRef.current?.swipeRight()}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    padding: 16,
    alignItems: 'center'
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8
  },
  loader: {
    marginTop: 8
  },
  swiperContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardContainer: {
    width: '80%',
    height: '60%',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  card: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  subText: {
    fontSize: 16,
    color: '#333',
    marginTop: 8
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    padding: 16
  }
})

export default ChunkingExample 