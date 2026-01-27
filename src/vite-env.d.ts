/// <reference types="vite/client" />
import React from 'react';

declare global {
    interface Window {
        datavizSupabase: any;
        datavizApiUrl: string;
    }

    namespace JSX {
        interface IntrinsicElements {
            'dataviz-tool-header': any;
        }
    }
}
