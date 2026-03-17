import { useRef, useEffect, useState } from 'react'
import '../App.css'
import { useI18n } from '../i18n'

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
    const { t } = useI18n()
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
            setError(t('saveModal.saveFailed'))
            console.error(err)
        } finally {
            setIsSaving(false)
        }
    }

    const handleCancel = () => {
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay">
            <div className="modal-content" role="dialog" aria-modal="true">
                <h2>{t('saveModal.title')}</h2>
                <form onSubmit={handleSubmit}>
                    {thumbnailUrl && (
                        <div className="modal-thumbnail-preview">
                            <img src={thumbnailUrl} alt="Preview" />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="project-name">{t('saveModal.nameLabel')}</label>
                        <input
                            id="project-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('saveModal.namePlaceholder')}
                            required
                            autoFocus
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="modal-actions">
                        <button type="button" onClick={handleCancel} disabled={isSaving} className="button-secondary">
                            {t('saveModal.cancel')}
                        </button>
                        <button type="submit" disabled={isSaving || !name.trim()} className="button-primary">
                            {isSaving ? t('saveModal.saving') : t('saveModal.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
