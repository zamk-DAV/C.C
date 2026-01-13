import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

interface LinkPreviewProps {
    url: string;
}

interface OGData {
    title: string;
    description: string;
    image: string;
    url: string;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({ url }) => {
    const [data, setData] = useState<OGData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchPreview = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/fetch-og?url=${encodeURIComponent(url)}`);
                if (!response.ok) throw new Error('Fetch failed');
                const ogData = await response.json();
                setData(ogData);
            } catch (err) {
                console.error('Link preview fetch error:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchPreview();
    }, [url]);

    if (error || (!loading && !data)) return null;

    return (
        <AnimatePresence>
            <motion.a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col rounded-xl overflow-hidden bg-secondary/30 border border-border mt-2 active:opacity-90 transition-opacity max-w-full"
            >
                {loading ? (
                    <div className="p-4 flex items-center justify-center space-x-2">
                        <div className="size-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                        <span className="text-[12px] text-text-secondary">링크 미리보기 불러오는 중...</span>
                    </div>
                ) : (
                    <>
                        {data?.image && (
                            <div className="w-full aspect-video bg-secondary overflow-hidden">
                                <img
                                    src={data.image}
                                    alt={data.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                            </div>
                        )}
                        <div className="p-3 space-y-1">
                            <h4 className="text-[13px] font-bold text-primary line-clamp-1 flex items-center gap-1">
                                {data?.title}
                                <ExternalLink className="size-3 opacity-50" />
                            </h4>
                            {data?.description && (
                                <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                                    {data.description}
                                </p>
                            )}
                            <span className="text-[10px] text-text-secondary/50 truncate block pt-1">
                                {new URL(url).hostname}
                            </span>
                        </div>
                    </>
                )}
            </motion.a>
        </AnimatePresence>
    );
};
