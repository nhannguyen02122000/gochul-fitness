'use client'

import { PlusOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * FABPortal renders a floating action button via a React Portal directly
 * into document.body. This guarantees the FAB escapes any overflow or
 * stacking-context constraints from parent containers.
 */
export function FABPortal({
    onClick,
    label = 'Action',
}: {
    onClick: () => void
    label?: string
}) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b6933cfe-e96a-473e-814b-968a30259cfc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'FABContext.tsx:useEffect', message: 'FABPortal mounted', data: { label, bodyExists: !!document.body, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight }, timestamp: Date.now(), hypothesisId: 'H4' }) }).catch(() => { });
        // #endregion
    }, [])

    // #region agent log
    useEffect(() => {
        if (mounted) {
            setTimeout(() => {
                const fabEl = document.querySelector('.fab') as HTMLElement | null;
                const styles = fabEl ? window.getComputedStyle(fabEl) : null;
                const rect = fabEl ? fabEl.getBoundingClientRect() : null;
                fetch('http://127.0.0.1:7242/ingest/b6933cfe-e96a-473e-814b-968a30259cfc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'FABContext.tsx:postRender', message: 'FAB element check', data: { fabFound: !!fabEl, display: styles?.display, visibility: styles?.visibility, opacity: styles?.opacity, zIndex: styles?.zIndex, position: styles?.position, bottom: styles?.bottom, right: styles?.right, width: styles?.width, height: styles?.height, overflow: styles?.overflow, rect: rect ? { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } : null, bodyOverflow: window.getComputedStyle(document.body).overflow, bodyOverflowY: window.getComputedStyle(document.body).overflowY, htmlOverflow: window.getComputedStyle(document.documentElement).overflow, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight }, timestamp: Date.now(), hypothesisId: 'H1,H3,H5' }) }).catch(() => { });
            }, 500);
        }
    }, [mounted])
    // #endregion

    if (!mounted) return null

    return createPortal(
        <button
            onClick={onClick}
            className="fab"
            aria-label={label}
        >
            <PlusOutlined className="text-white text-2xl" />
        </button>,
        document.body
    )
}
