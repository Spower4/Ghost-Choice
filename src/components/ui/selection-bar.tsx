'use client'

import { useState } from 'react'
import { Product, AIScene } from '@/types'

interface SelectionBarProps {
  products: Product[]
  selectedProducts: string[]
  onProductToggle: (productId: string) => void
  onGenerateScene: (style: AISceneStyle, selectedProducts: string[]) => void
  isGenerating?: boolean
  generatedScenes?: AIScene[]
  className?: string
}

type AISceneStyle = 'Cozy' | 'Minimal' | 'Gaming' | 'Modern'

const SCENE_STYLES: { value: AISceneStyle; label: string; description: string; icon: string }[] = [
  {
    value: 'Cozy',
    label: 'Cozy',
    description: 'Warm, comfortable living spaces',
    icon: '🏠'
  },
  {
    value: 'Minimal',
    label: 'Minimal',
    description: 'Clean, simple, uncluttered',
    icon: '✨'
  },
  {
    value: 'Gaming',
    label: 'Gaming',
    description: 'RGB lighting, gaming aesthetic',
    icon: '🎮'
  },
  {
    value: 'Modern',
    label: 'Modern',
    description: 'Contemporary, sleek design',
    icon: '🏢'
  }
]

export function SelectionBar({ 
  products, 
  selectedProducts, 
  onProductToggle, 
  onGenerateScene,
  isGenerating = false,
  generatedScenes = [],
  className = '' 
}: SelectionBarProps) {
  const [selectedStyle, setSelectedStyle] = useState<AISceneStyle>('Modern')
  const [showSceneGallery, setShowSceneGallery] = useState(false)

  const handleGenerateScene = () => {
    if (selectedProducts.length === 0) return
    onGenerateScene(selectedStyle, selectedProducts)
    setShowSceneGallery(true)
  }

  const getProductById = (id: string) => products.find(p => p.id === id)

  return (
    <div className={`bg-white border-t border-gray-200 ${className}`}>
      {/* Product Selection */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">
            Select Products for AI Scene ({selectedProducts.length}/{products.length})
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                // Select all products
                products.forEach(product => {
                  if (!selectedProducts.includes(product.id)) {
                    onProductToggle(product.id)
                  }
                })
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Select All
            </button>
            <button
              onClick={() => {
                // Deselect all products
                selectedProducts.forEach(productId => {
                  onProductToggle(productId)
                })
              }}
              className="text-xs text-gray-600 hover:text-gray-800 font-medium"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Product Selection Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {products.map((product) => {
            const isSelected = selectedProducts.includes(product.id)
            return (
              <button
                key={product.id}
                onClick={() => onProductToggle(product.id)}
                className={`relative p-2 rounded-lg border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {/* Product Image */}
                <div className="aspect-square bg-gray-100 rounded-md mb-2 overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                </div>

                {/* Product Title */}
                <p className="text-xs text-gray-700 line-clamp-2 text-left">
                  {product.title}
                </p>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {/* Category Badge */}
                {product.category && (
                  <div className="absolute top-1 left-1">
                    <span className="px-1 py-0.5 text-xs bg-gray-800 text-white rounded">
                      {product.category.slice(0, 3)}
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Style Selection and Generation */}
      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          {/* Style Selection */}
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Choose Scene Style</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SCENE_STYLES.map((style) => (
                <button
                  key={style.value}
                  onClick={() => setSelectedStyle(style.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                    selectedStyle === style.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg">{style.icon}</span>
                    <span className="text-sm font-medium text-gray-900">{style.label}</span>
                  </div>
                  <p className="text-xs text-gray-600">{style.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex-shrink-0 sm:ml-6">
            <button
              onClick={handleGenerateScene}
              disabled={selectedProducts.length === 0 || isGenerating}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                selectedProducts.length === 0 || isGenerating
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {isGenerating ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Generate AI Scene</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Selection Summary */}
        {selectedProducts.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-medium">{selectedProducts.length} products selected:</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedProducts.slice(0, 5).map((productId) => {
                const product = getProductById(productId)
                return product ? (
                  <span
                    key={productId}
                    className="px-2 py-1 bg-white text-xs text-gray-700 rounded border"
                  >
                    {product.title.slice(0, 20)}...
                  </span>
                ) : null
              })}
              {selectedProducts.length > 5 && (
                <span className="px-2 py-1 bg-gray-200 text-xs text-gray-600 rounded">
                  +{selectedProducts.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Scene Gallery */}
      {showSceneGallery && generatedScenes.length > 0 && (
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900">Generated Scenes</h4>
            <button
              onClick={() => setShowSceneGallery(false)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Hide Gallery
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedScenes.map((scene, index) => (
              <div key={scene.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="aspect-video bg-gray-100">
                  <img
                    src={scene.imageUrl}
                    alt={`AI Generated Scene ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/placeholder-scene.jpg'
                    }}
                  />
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{scene.style} Style</span>
                    <span className="text-xs text-gray-500">
                      {new Date(scene.generatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{scene.prompt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}