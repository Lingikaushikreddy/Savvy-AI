
import React from 'react'
import ReactMarkdown from 'react-markdown'
import { motion } from 'framer-motion'
import { Check, Copy, Wand2 } from 'lucide-react'

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
            <div className="relative group my-4 rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#0f1117]">
                <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                        </div>
                        <span className="text-xs text-gray-400 font-mono ml-2 uppercase opacity-70">{match[1]}</span>
                    </div>
                    <motion.button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-all text-xs"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        {copied ? <span className="text-green-400">Copied!</span> : 'Copy'}
                    </motion.button>
                </div>
                <div className="p-4 overflow-x-auto text-sm custom-scrollbar bg-[#0d1117]">
                    <code className={`${className} font-mono`} {...props}>
                        {children}
                    </code>
                </div>
            </div>
        )
    }

    return (
        <code className={`${className} px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 font-mono text-sm border border-purple-500/20`} {...props}>
            {children}
        </code>
    )
}

export const ResponseDisplay: React.FC<ResponseDisplayProps> = ({ content, isStreaming }) => {
    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1 max-h-[450px]">
            {content ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-headings:text-transparent prose-headings:bg-clip-text prose-headings:bg-gradient-to-r prose-headings:from-purple-400 prose-headings:to-blue-400 prose-strong:text-purple-200 prose-a:text-cyan-400 hover:prose-a:text-cyan-300"
                >
                    <ReactMarkdown
                        components={{
                            code: CodeBlock as any,
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                </motion.div>
            ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                        className="mb-4 relative"
                    >
                        <Wand2 className="w-12 h-12 text-purple-500/50" />
                        <div className="absolute inset-0 blur-xl bg-purple-500/20 rounded-full" />
                    </motion.div>
                    <p className="text-sm font-medium text-gradient">Ready to assist</p>
                    <p className="text-xs text-gray-600 mt-1">Press <kbd className="bg-white/10 px-1 rounded mx-1">⌘⇧A</kbd> or click Ask AI</p>
                </div>
            )}

            {isStreaming && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 flex items-center gap-2"
                >
                    <motion.div
                        className="w-2 h-2 rounded-full bg-purple-500"
                        animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 1, 0.5]
                        }}
                        transition={{
                            duration: 1,
                            repeat: Infinity,
                        }}
                    />
                    <span className="text-xs text-purple-400/80 animate-pulse">Generating response...</span>
                </motion.div>
            )}
        </div>
    )
}
