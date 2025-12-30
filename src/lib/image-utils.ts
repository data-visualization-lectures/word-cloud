export async function svgToPngBlob(
    svgElement: SVGSVGElement,
    width: number,
    height: number,
    backgroundColor = '#ffffff'
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        try {
            const serializer = new XMLSerializer()
            const source = serializer.serializeToString(svgElement)
            const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const image = new Image()
            image.crossOrigin = 'anonymous'

            image.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    URL.revokeObjectURL(url)
                    reject(new Error('Failed to get canvas context'))
                    return
                }

                // Fill background
                if (backgroundColor) {
                    ctx.fillStyle = backgroundColor
                    ctx.fillRect(0, 0, canvas.width, canvas.height)
                }

                ctx.drawImage(image, 0, 0)

                canvas.toBlob((pngBlob) => {
                    URL.revokeObjectURL(url)
                    if (pngBlob) {
                        resolve(pngBlob)
                    } else {
                        reject(new Error('Failed to create PNG blob'))
                    }
                }, 'image/png')
            }

            image.onerror = () => {
                URL.revokeObjectURL(url)
                reject(new Error('Failed to load SVG image'))
            }

            image.src = url
        } catch (err) {
            reject(err)
        }
    })
}

export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
            resolve(reader.result as string)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}
