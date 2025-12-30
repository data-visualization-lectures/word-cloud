import { useRef, useEffect, useState } from 'react'
import '../App.css' // Re-using main CSS or should create component specific? Using global for now for modal styles if they exist, or inline.

interface SaveProjectModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (name: string) => Promise<void>
    initialName?: string
    thumbnailBlob: Blob | null
}

export function SaveProjectModal({
    isOpen,
    onClose,
    onSave,
    initialName = '',
    thumbnailBlob,
}: SaveProjectModalProps) {
    const [name, setName] = useState(initialName)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const dialogRef = useRef<HTMLDialogElement>(null)
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            dialogRef.current?.showModal()
            setName(initialName)
        } else {
            dialogRef.current?.close()
        }
    }, [isOpen, initialName])

    useEffect(() => {
        if (thumbnailBlob) {
            const url = URL.createObjectURL(thumbnailBlob)
            setThumbnailUrl(url)
            return () => URL.revokeObjectURL(url)
        }
        setThumbnailUrl(null)
    }, [thumbnailBlob])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setIsSaving(true)
        setError(null)
        try {
            await onSave(name)
            onClose()
        } catch (err) {
            setError('保存に失敗しました。')
            console.error(err)
        } finally {
            setIsSaving(false)
        }
    }

    // Handle escape key via native dialog behavior implicitly, but ensure sync with isOpen
    const handleCancel = () => {
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay">
            <div className="modal-content" role="dialog" aria-modal="true">
                <h2>プロジェクトを保存</h2>
                <form onSubmit={handleSubmit}>
                    {thumbnailUrl && (
                        <div className="modal-thumbnail-preview">
                            <img src={thumbnailUrl} alt="Preview" />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="project-name">プロジェクト名</label>
                        <input
                            id="project-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="プロジェクト名を入力"
                            required
                            autoFocus
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="modal-actions">
                        <button type="button" onClick={handleCancel} disabled={isSaving} className="button-secondary">
                            キャンセル
                        </button>
                        <button type="submit" disabled={isSaving || !name.trim()} className="button-primary">
                            {isSaving ? '保存中...' : '保存'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
