import Link from "next/link";
import Image from "next/image";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.deanfieldz.yummy";

export default function Footer() {
    return (
        <footer className="py-16 border-t border-surface-800">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid md:grid-cols-4 gap-12 mb-12">
                    <div className="md:col-span-2">
                        <Link href="/" className="flex items-center gap-3 mb-4">
                            <Image src="/icon.png" alt="Snap Recipes" width={40} height={40} className="rounded-xl shadow-lg" />
                            <span className="text-xl font-bold">Snap Recipes</span>
                        </Link>
                        <p className="text-surface-400 max-w-sm">Save any recipe from anywhere. Never lose a recipe again.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-4">Product</h4>
                        <ul className="space-y-3">
                            <li><Link href="/#features" className="text-surface-400 hover:text-white transition-colors">Features</Link></li>
                            <li><Link href="/#pricing" className="text-surface-400 hover:text-white transition-colors">Pricing</Link></li>
                            <li><a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="text-surface-400 hover:text-white transition-colors">Download</a></li>
                            <li><Link href="/recipes" className="text-surface-400 hover:text-white transition-colors">Recipes</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-4">Legal</h4>
                        <ul className="space-y-3">
                            <li><Link href="/privacy.html" className="text-surface-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/delete-account.html" className="text-surface-400 hover:text-white transition-colors">Delete Account</Link></li>
                            <li><a href="mailto:singlesourcedigitalmarketing@gmail.com" className="text-surface-400 hover:text-white transition-colors">Contact</a></li>
                        </ul>
                    </div>
                </div>
                <div className="pt-8 border-t border-surface-800 text-center">
                    <p className="text-surface-500 text-sm">&copy; {new Date().getFullYear()} Snap Recipes. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
