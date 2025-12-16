
import React from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import { motion } from 'framer-motion'
import { Check, Copy } from 'lucide-react'
import 'highlight.js/styles/github-dark.css' // Import highlight.js styles

interface ResponseDisplayProps {
    content: string
    isStreaming: boolean
}

// Custom Code Block Renderer with Copy Button
const CodeBlock = ({ inline, className, children, ...props }: any) => {
    const [copied, setCopied] = React.useState(false)

    const match = /language-(\w+)/.exec(className || '')

    const handleCopy = () => {
        navigator.clipboard.writeText(String(children).replace(/\n$/, ''))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (!inline && match) {
        return (
            <div className="relative group my-4 rounded-lg overflow-hidden border border-gray-700 bg-[#0d1117]">
                <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/50 border-b border-gray-700 text-xs text-gray-400">
                    <span>{match[1]}</span>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
                <div className="p-4 overflow-x-auto text-sm">
                    <code className={className} {...props}>
                        {children}
                    </code>
                </div>
            </div>
        )
    }

    return (
        <code className={`${className} px-1.5 py-0.5 rounded bg-gray-700/50 text-blue-200 text-sm`} {...props}>
            {children}
        </code>
    )
}

export const ResponseDisplay: React.FC<ResponseDisplayProps> = ({ content, isStreaming }) => {
    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
            {content ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="prose prose-invert prose-sm max-w-none"
                >
                    <ReactMarkdown
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                            code: CodeBlock as any,
                            // Add other custom renderers if needed
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                </motion.div>
            ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500 text-sm">
                    <p>Ready to assist.</p>
                    <p className="text-xs opacity-60 mt-1">Press Cmd+Shift+A or click Ask AI</p>
                </div>
            )}

            {isStreaming && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 text-xs text-blue-400 animate-pulse"
                >
                    ●
                </motion.div>
            )}
        </div>
    )
}
