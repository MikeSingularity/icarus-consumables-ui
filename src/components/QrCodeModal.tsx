import { QRCodeSVG } from 'qrcode.react'

/**
 * Modal that shows a QR code for the current page URL.
 * Scanning the code opens the same loadout and recipe state on another device.
 */
interface QrCodeModalProps {
  /** Called when the modal should be closed. */
  onClose: () => void
}

/** Size of the QR code in pixels; large enough for reliable scanning. */
const QR_SIZE = 256

export function QrCodeModal({ onClose }: QrCodeModalProps): React.JSX.Element {
  const url = typeof window !== 'undefined' ? window.location.href : ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3">
          <h2 className="text-sm font-semibold text-gray-100">Share link</h2>
          <button
            className="text-xs text-gray-400 hover:text-gray-100"
            onClick={onClose}
            aria-label="Close QR code"
          >
            Close
          </button>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          Scan with your phone to open this loadout and recipe setup.
        </p>
        <div className="flex justify-center rounded-lg bg-white p-4">
          {url ? (
            <QRCodeSVG value={url} size={QR_SIZE} level="M" />
          ) : (
            <span className="flex h-[256px] w-[256px] items-center justify-center text-gray-500">
              No URL
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
