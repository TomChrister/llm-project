export function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
    return (
        <div>
            <p className='text-[14px] mb-8 text-[#28409E] font-bold'>AI-POWERED</p>
            <h1
                className={`m-0 font-display font-medium text-[var(--text-primary)] italic ${
                    size === "lg" ? "text-[36px]" : "text-[28px]"
                }`}
            >
                Job Application Assistant
            </h1>
        </div>
    );
}
