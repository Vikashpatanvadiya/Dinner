import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/DashboardLayout";
import { getRestaurantId } from "@/lib/auth";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Copy, ExternalLink, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function QR() {
  const [, setLocation] = useLocation();
  const restaurantId = getRestaurantId();
  const { toast } = useToast();
  const qrRef = useRef<SVGSVGElement>(null);

  if (!restaurantId) {
    setLocation("/restaurant/login");
    return null;
  }

  // Construct the absolute URL to the public queue page
  const queueUrl = `${window.location.origin}/restaurant/${restaurantId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(queueUrl).then(() => {
      toast({
        title: "Copied",
        description: "Link copied to clipboard",
      });
    });
  };

  const openLink = () => {
    window.open(queueUrl, "_blank");
  };

  const downloadQR = () => {
    if (!qrRef.current) return;
    
    // Create a canvas to draw the SVG onto, to download as PNG
    const svgData = new XMLSerializer().serializeToString(qrRef.current);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    // Set higher resolution for printing
    const size = 1000;
    canvas.width = size;
    canvas.height = size;
    
    img.onload = () => {
      if (!ctx) return;
      // Fill white background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, size, size);
      // Draw SVG
      ctx.drawImage(img, 0, 0, size, size);
      
      // Trigger download
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `queue-qr-${restaurantId}.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const printQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !qrRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(qrRef.current);
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code</title>
          <style>
            body { 
              display: flex; 
              flex-direction: column;
              align-items: center; 
              justify-content: center;
              height: 100vh;
              margin: 0;
              font-family: sans-serif;
            }
            .container { text-align: center; }
            h1 { font-size: 3rem; margin-bottom: 0.5rem; }
            p { font-size: 1.5rem; color: #666; margin-bottom: 2rem; }
            svg { width: 400px; height: 400px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Scan to Join Queue</h1>
            <p>Skip the line. Order ahead.</p>
            ${svgData}
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">QR Code Signage</h1>
          <p className="text-muted-foreground">Print or display this code at your host stand so customers can join the queue.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <Card className="shadow-lg border-primary/20 overflow-hidden">
            <div className="bg-primary text-primary-foreground p-8 text-center">
              <h2 className="text-3xl font-bold mb-2 tracking-tight">Scan to Join</h2>
              <p className="opacity-90 font-medium">Skip the line. Pre-order your food.</p>
            </div>
            <CardContent className="p-12 flex items-center justify-center bg-white">
              <div className="p-4 bg-white rounded-xl shadow-sm border">
                <QRCodeSVG 
                  value={queueUrl}
                  size={250}
                  level="H"
                  includeMargin={false}
                  ref={qrRef}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Direct Link</CardTitle>
                <CardDescription>Share this link on your website or social media.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input readOnly value={queueUrl} className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={copyToClipboard} title="Copy">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={openLink} title="Open in new tab">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Signage Output</CardTitle>
                <CardDescription>Download a high-resolution PNG or print directly.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-4">
                <Button className="flex-1 gap-2 h-12 text-base" onClick={downloadQR}>
                  <Download className="h-5 w-5" /> Download PNG
                </Button>
                <Button variant="secondary" className="flex-1 gap-2 h-12 text-base" onClick={printQR}>
                  <Printer className="h-5 w-5" /> Print Sign
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}