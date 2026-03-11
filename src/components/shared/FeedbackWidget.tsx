'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageSquarePlus, X, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const CATEGORIES = [
  { value: 'bug', label: 'Bug' },
  { value: 'ux', label: 'UX Issue' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'other', label: 'Other' },
] as const

export function FeedbackWidget() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [category, setCategory] = useState<string>('other')
  const [rating, setRating] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(false)

  const handleSubmit = async () => {
    if (!comment.trim()) return
    setIsSubmitting(true)
    setSubmitError(false)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: pathname,
          comment: comment.trim(),
          category,
          ...(rating && { rating }),
        }),
      })
      if (!res.ok) throw new Error('Failed')
      setSubmitted(true)
      setTimeout(() => {
        setIsOpen(false)
        setSubmitted(false)
        setComment('')
        setCategory('other')
        setRating(null)
      }, 1500)
    } catch {
      setSubmitError(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-full shadow-lg hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Feedback
        </button>
      )}

      {/* Feedback panel */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-gray-900 text-sm">Send Feedback</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {submitted ? (
            <div className="p-6 text-center">
              <p className="text-green-600 font-medium">Thanks for your feedback!</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {/* Category */}
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      category === cat.value
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 mr-1">Rating:</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(rating === n ? null : n)}
                    className={`w-7 h-7 rounded text-sm font-medium transition-colors ${
                      rating === n
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              {/* Comment */}
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What could be better?"
                rows={3}
                className="text-sm resize-none"
              />

              {/* Error */}
              {submitError && (
                <p className="text-xs text-red-500">Failed to send. Try again.</p>
              )}

              {/* Page context */}
              <p className="text-xs text-gray-400 truncate">Page: {pathname}</p>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={!comment.trim() || isSubmitting}
                size="sm"
                className="w-full"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                Send
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
