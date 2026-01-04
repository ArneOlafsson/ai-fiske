import FishIdentifier from '@/components/features/FishIdentifier';

export default function IdentifyPage() {
    return (
        <div className="space-y-6">
            <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold">Identifiera Fångst</h1>
                <p className="text-muted-foreground">Ladda upp en bild och låt AI berätta vad du fått på kroken.</p>
            </div>
            <FishIdentifier />
        </div>
    );
}
