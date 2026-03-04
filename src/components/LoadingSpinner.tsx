/**
 * Centered full-page loading spinner shown while the data fetch is in progress.
 */
export function LoadingSpinner(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-blue-400" />
    </div>
  )
}
