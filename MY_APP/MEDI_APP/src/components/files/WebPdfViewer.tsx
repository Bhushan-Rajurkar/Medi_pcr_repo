import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { BorderRadius, Spacing } from '@/constants/theme';
import { api } from '@/services/api';

interface WebPdfViewerProps {
  primaryUrl: string;
  fallbackUrl?: string;
  fileName: string;
  onOpenExternal?: () => void;
  onDownload?: () => void;
}

const PDFJS_SCRIPT_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export const WebPdfViewer: React.FC<WebPdfViewerProps> = ({
  primaryUrl,
  fallbackUrl,
  fileName,
  onOpenExternal,
  onDownload,
}) => {
  const { colors, isDark } = useAppTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [renderingPage, setRenderingPage] = useState<boolean>(false);

  // Load PDF.js script dynamically on web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    let isMounted = true;

    const initPdfJs = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        // Check if PDF.js is already available in window
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${PDFJS_SCRIPT_SRC}"]`);
            if (existingScript) {
              existingScript.addEventListener('load', () => resolve());
              existingScript.addEventListener('error', (e) => reject(e));
              // In case it already loaded
              if ((window as any).pdfjsLib) resolve();
              return;
            }

            const script = document.createElement('script');
            script.src = PDFJS_SCRIPT_SRC;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = (e) => reject(new Error('Failed to load PDF rendering engine'));
            document.head.appendChild(script);
          });
        }

        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          throw new Error('PDF.js library is not available');
        }

        if (pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
        }

        // Fetch PDF binary data with fallback handling
        let pdfDataBuffer: ArrayBuffer | null = null;
        let lastError: any = null;

        const candidateUrls = [primaryUrl, fallbackUrl].filter(Boolean) as string[];

        for (const targetUrl of candidateUrls) {
          try {
            const reqHeaders: Record<string, string> = {};
            if (!targetUrl.includes('cloudinary.com')) {
              try {
                const token = api.getToken();
                if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
              } catch {}
            }
            const res = await fetch(targetUrl, { mode: 'cors', headers: reqHeaders });
            if (res.ok) {
              pdfDataBuffer = await res.arrayBuffer();
              break;
            }
          } catch (fetchErr) {
            lastError = fetchErr;
          }
        }

        if (!pdfDataBuffer) {
          throw lastError || new Error('Could not load PDF document data from storage');
        }

        const loadingTask = pdfjsLib.getDocument({ data: pdfDataBuffer });
        const doc = await loadingTask.promise;

        if (isMounted) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setCurrentPage(1);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('[WebPdfViewer] Render failed, falling back to direct options:', err);
          setErrorMsg(err.message || 'Unable to display PDF preview inline.');
          setLoading(false);
        }
      }
    };

    initPdfJs();

    return () => {
      isMounted = false;
    };
  }, [primaryUrl, fallbackUrl]);

  // Render current page onto canvas
  useEffect(() => {
    if (!pdfDoc || Platform.OS !== 'web' || !canvasRef.current) return;

    let isCancelled = false;
    setRenderingPage(true);

    const render = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const viewport = page.getViewport({ scale });
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.warn('[WebPdfViewer] Page render error:', err);
      } finally {
        if (!isCancelled) {
          setRenderingPage(false);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, scale]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((p) => p + 1);
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 2.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.6));
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Loading Document Pages...
        </Text>
      </View>
    );
  }

  if (errorMsg || !pdfDoc) {
    return (
      <View style={[styles.errorCard, { backgroundColor: isDark ? colors.surfaceElevated : '#F8FAFC', borderColor: colors.border }]}>
        <Text style={{ fontSize: 36 }}>📄</Text>
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          {fileName}
        </Text>
        <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
          {errorMsg || 'This PDF cannot be rendered inline inside this browser session.'}
        </Text>
        <View style={styles.errorBtnRow}>
          {onOpenExternal && (
            <Pressable
              onPress={onOpenExternal}
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.actionBtnText}>Open in New Tab ↗</Text>
            </Pressable>
          )}
          {onDownload && (
            <Pressable
              onPress={onDownload}
              style={[styles.actionBtnOutline, { borderColor: colors.border }]}>
              <Text style={[styles.actionBtnOutlineText, { color: colors.text }]}>Download File</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Controls Toolbar */}
      <View
        style={[
          styles.toolbar,
          {
            backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9',
            borderBottomColor: colors.border,
          },
        ]}>
        {/* Pagination Controls */}
        <View style={styles.toolGroup}>
          <Pressable
            onPress={handlePrevPage}
            disabled={currentPage <= 1 || renderingPage}
            style={({ pressed }) => [
              styles.toolBtn,
              currentPage <= 1 && styles.toolBtnDisabled,
              { opacity: pressed ? 0.6 : 1 },
            ]}>
            <Text style={[styles.toolBtnText, { color: currentPage <= 1 ? colors.textSecondary : colors.text }]}>
              ◀ Prev
            </Text>
          </Pressable>

          <Text style={[styles.pageInfoText, { color: colors.text }]}>
            Page {currentPage} of {totalPages}
          </Text>

          <Pressable
            onPress={handleNextPage}
            disabled={currentPage >= totalPages || renderingPage}
            style={({ pressed }) => [
              styles.toolBtn,
              currentPage >= totalPages && styles.toolBtnDisabled,
              { opacity: pressed ? 0.6 : 1 },
            ]}>
            <Text style={[styles.toolBtnText, { color: currentPage >= totalPages ? colors.textSecondary : colors.text }]}>
              Next ▶
            </Text>
          </Pressable>
        </View>

        {/* Zoom Controls */}
        <View style={styles.toolGroup}>
          <Pressable
            onPress={handleZoomOut}
            style={({ pressed }) => [styles.toolBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[styles.toolBtnText, { color: colors.text }]}>🔍 -</Text>
          </Pressable>

          <Text style={[styles.zoomText, { color: colors.textSecondary }]}>
            {Math.round(scale * 100)}%
          </Text>

          <Pressable
            onPress={handleZoomIn}
            style={({ pressed }) => [styles.toolBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[styles.toolBtnText, { color: colors.text }]}>🔍 +</Text>
          </Pressable>
        </View>
      </View>

      {/* PDF Canvas Viewport */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.canvasContainer}>
          {Platform.OS === 'web' && (
            <canvas
              ref={canvasRef as any}
              style={{
                borderRadius: 4,
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                backgroundColor: '#FFFFFF',
                maxWidth: '100%',
              }}
            />
          )}
          {renderingPage && (
            <View style={styles.renderingOverlay}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
    minHeight: 400,
    maxHeight: 580,
    display: 'flex',
    flexDirection: 'column',
  },
  centerBox: {
    height: 380,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  statusText: {
    fontSize: 13,
    marginTop: Spacing.two,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  toolGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  toolBtn: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  toolBtnDisabled: {
    opacity: 0.35,
  },
  toolBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pageInfoText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'center',
  },
  zoomText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 44,
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  canvasContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  renderingOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  errorCard: {
    padding: Spacing.five,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 320,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 18,
  },
  errorBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  actionBtn: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.md,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  actionBtnOutline: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  actionBtnOutlineText: {
    fontWeight: '600',
    fontSize: 13,
  },
});
