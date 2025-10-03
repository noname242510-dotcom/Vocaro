import Link from 'next/link';
import { MoreVertical, Plus, Upload, Pen, BookCopy, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { mockSubjects, mockStacks } from '@/lib/data';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function SubjectDetailPage({ params }: { params: { subjectId: string } }) {
  const subject = mockSubjects.find((s) => s.id === params.subjectId);
  const stacks = mockStacks.filter((s) => s.subjectId === params.subjectId);
  const ocrImage = PlaceHolderImages[0];

  if (!subject) {
    return <div>Fach nicht gefunden</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className="text-5xl">{subject.emoji}</span>
          <div>
            <h1 className="text-3xl font-bold font-headline">{subject.name}</h1>
            <p className="text-muted-foreground">Verwalte deine Vokabelstapel für dieses Fach.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Stapel erstellen</Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Vokabeln hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>Neue Vokabeln hinzufügen</DialogTitle>
                <DialogDescription>
                  Füge Begriffe manuell hinzu oder lade ein Bild hoch, um Text mit OCR zu extrahieren.
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="manual">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual"><Pen className="mr-2 h-4 w-4" />Manuell</TabsTrigger>
                  <TabsTrigger value="ocr"><Upload className="mr-2 h-4 w-4" />OCR aus Bild</TabsTrigger>
                </TabsList>
                <TabsContent value="manual" className="pt-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="term">Begriff</Label>
                      <Input id="term" placeholder="z.B., Fotosynthese" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="definition">Definition</Label>
                      <Textarea id="definition" placeholder="z.B., Der Prozess, bei dem grüne Pflanzen Sonnenlicht nutzen..." />
                    </div>
                    <Button>Begriff hinzufügen</Button>
                  </div>
                </TabsContent>
                <TabsContent value="ocr" className="pt-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="picture">Bild</Label>
                      <Input id="picture" type="file" />
                    </div>
                    <div className="relative w-full h-64 rounded-md border border-dashed flex items-center justify-center bg-muted/40">
                      {ocrImage && (
                        <Image src={ocrImage.imageUrl} alt={ocrImage.description} layout="fill" objectFit="contain" className="rounded-md" data-ai-hint={ocrImage.imageHint} />
                      )}
                      <p className="text-sm text-muted-foreground">Bildvorschau</p>
                    </div>
                    <Button><Upload className="mr-2 h-4 w-4" /> Vokabeln extrahieren</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {stacks.map((stack) => (
          <Card key={stack.id} className="flex flex-col">
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle className="font-headline">{stack.name}</CardTitle>
                <CardDescription className="flex items-center gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1.5"><BookCopy className="h-3 w-3" /> {stack.vocabCount} Begriffe</span>
                  {stack.lastStudied && <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {stack.lastStudied}</span>}
                </CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Umbenennen</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">Löschen</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="flex-grow flex items-end">
              <Button className="w-full" asChild>
                <Link href={`/dashboard/stacks/${stack.id}/learn`}><Zap className="mr-2 h-4 w-4"/> Lernen starten</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
