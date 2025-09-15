'use client'

import { useState, useEffect } from 'react'
import { Product } from '@/types'
import { ProductCard } from './product-card'
import Noise from '@/components/ui/noise'

interface SwapModalProps {
  isOpen: boolean
  onClose: () => void
  originalProduct: Product
  alternatives: Product[]
  onSelectAlternative: (product: Product) => void
  isLoading?: boolean
}

export function SwapModal({
  isOpen,
  onClose,
  originalProduct,
  alternatives,
  onSelectAlternative,
  isLoading = false
}: SwapModalProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
  }

  const handleConfirmSwap = () => {
    if (selectedProduct) {
      onSelectAlternative(selectedProduct)
      onClose()
      setSelectedProduct(null)
    }
  }

  const handleCancel = () => {
    onClose()
    setSelectedProduct(null)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-card border border-border rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
          {/* Noise Effect */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <Noise 
              patternAlpha={5} 
              patternRefreshInterval={4}
            />
          </div>
          {/* Header */}
          <div className="relative px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-card-foreground">
                Swap Product
              </h2>
              <button
                onClick={handleCancel}
                className="text-muted-foreground hover:text-card-foreground transition-colors p-1 rounded-lg hover:bg-accent"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Choose an alternative for: <span className="text-card-foreground font-medium">{originalProduct.title}</span>
            </p>
          </div>

          {/* Content */}
          <div className="relative p-6 overflow-y-auto max-h-[calc(90vh-200px)] bg-card/20">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Finding alternatives...</p>
                </div>
              </div>
            ) : alternatives.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 9.34c-.665-.995-1.824-1.34-3-1.34s-2.335.345-3 1.34m12 6.66a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-card-foreground mb-2">No alternatives found</h3>
                <p className="text-muted-foreground">
                  We couldn't find any suitable alternatives for this product. Try adjusting your budget or search criteria.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-card-foreground mb-4">
                  Choose an alternative ({alternatives.length} options)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {alternatives.map((product) => (
                    <div
                      key={product.id}
                      className={`relative cursor-pointer transition-all duration-200 rounded-xl ${selectedProduct?.id === product.id
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-105'
                        : 'hover:scale-102 hover:shadow-xl'
                        }`}
                      onClick={() => handleSelectProduct(product)}
                    >
                      <ProductCard
                        product={product}
                        onSwap={() => { }} // Disable swap in modal
                        showRationale={true}
                        className={`transition-all duration-200 ${selectedProduct?.id === product.id ? 'border-primary shadow-lg' : 'hover:border-primary/50'}`}
                      />

                      {/* Selection indicator */}
                      {selectedProduct?.id === product.id && (
                        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 shadow-lg animate-scale-in">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className={`absolute inset-0 rounded-xl transition-all duration-200 pointer-events-none ${selectedProduct?.id === product.id
                        ? 'bg-primary/5'
                        : 'hover:bg-primary/5'
                        }`} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {!isLoading && alternatives.length > 0 && (
            <div className="relative px-6 py-4 border-t border-border bg-card/80 backdrop-blur-sm">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancel}
                  className="px-6 py-2 text-muted-foreground border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSwap}
                  disabled={!selectedProduct}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg disabled:shadow-none"
                >
                  {selectedProduct ? 'Swap Product' : 'Select Product'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}