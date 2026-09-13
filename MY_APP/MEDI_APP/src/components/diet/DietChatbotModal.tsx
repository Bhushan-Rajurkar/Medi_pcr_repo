import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { BorderRadius, Spacing, Shadows } from '@/constants/theme';
import {
  PREDEFINED_QUESTIONS,
  McqQuestion,
  ChatMessage,
  StructuredDietPlanResult,
  aiDietService,
} from '@/services/aiDietService';
import {
  CloseIcon,
  SparklesIcon,
  SendIcon,
  RefreshCwIcon,
  CopyIcon,
  CheckIcon,
  DietIcon,
  DownloadIcon,
  FileTextIcon,
} from '@/components/common/Icons';

interface DietChatbotModalProps {
  visible: boolean;
  onClose: () => void;
  isFullScreenTab?: boolean;
}

export const DietChatbotModal: React.FC<DietChatbotModalProps> = ({
  visible,
  onClose,
  isFullScreenTab = false,
}) => {
  const { colors, isDark } = useAppTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const isMobile = width < 640;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [generating, setGenerating] = useState<boolean>(false);
  const [followUpInput, setFollowUpInput] = useState<string>('');
  const [followUpLoading, setFollowUpLoading] = useState<boolean>(false);
  const [copiedPlan, setCopiedPlan] = useState<boolean>(false);
  const [assessmentComplete, setAssessmentComplete] = useState<boolean>(false);
  const [tablePreviewOpen, setTablePreviewOpen] = useState<Record<string, boolean>>({});

  const toggleTablePreview = (msgId: string) => {
    setTablePreviewOpen((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // Initialize initial welcome message and Question 1
  useEffect(() => {
    if (messages.length === 0) {
      resetChat();
    }
  }, []);

  const resetChat = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSelectedOptions([]);
    setAssessmentComplete(false);
    setGenerating(false);

    const initialBotMessage: ChatMessage = {
      id: 'welcome_1',
      sender: 'bot',
      text: "👋 **Welcome to your Medi-AI Diet & Fitness Assistant!**\n\nI will guide you through **10 quick questions** to design an affordable, realistic **7-Day Diet & Exercise Plan** tailored specifically to your health goals, dietary preferences, allergies, and daily routine. You can select multiple options where applicable.",
      timestamp: Date.now(),
    };

    const firstQuestionMessage: ChatMessage = {
      id: 'q_0',
      sender: 'bot',
      text: `**Question 1 of 10:** ${PREDEFINED_QUESTIONS[0].title}\n*${PREDEFINED_QUESTIONS[0].subtitle}*`,
      isQuestion: true,
      questionIndex: 0,
      timestamp: Date.now() + 10,
    };

    setMessages([initialBotMessage, firstQuestionMessage]);
  };

  const toggleOption = (question: McqQuestion, optionLabel: string) => {
    if (question.isMultiSelect) {
      const isNone =
        optionLabel.toLowerCase().includes('none') ||
        optionLabel.toLowerCase().includes('nothing') ||
        optionLabel.toLowerCase().includes('no known');

      setSelectedOptions((prev) => {
        if (isNone) {
          return prev.includes(optionLabel) ? [] : [optionLabel];
        }
        const withoutNone = prev.filter(
          (item) =>
            !item.toLowerCase().includes('none') &&
            !item.toLowerCase().includes('nothing') &&
            !item.toLowerCase().includes('no known')
        );
        if (withoutNone.includes(optionLabel)) {
          return withoutNone.filter((item) => item !== optionLabel);
        } else {
          return [...withoutNone, optionLabel];
        }
      });
    } else {
      setSelectedOptions([optionLabel]);
    }
  };

  const confirmAndProceed = (question: McqQuestion) => {
    if (selectedOptions.length === 0) return;

    const combinedAnswer = selectedOptions.join(', ');
    const updatedAnswers = { ...answers, [question.id]: combinedAnswer };
    setAnswers(updatedAnswers);

    const userMessage: ChatMessage = {
      id: `user_ans_${question.id}_${Date.now()}`,
      sender: 'user',
      text: combinedAnswer,
      timestamp: Date.now(),
    };

    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    setSelectedOptions([]);

    const newMessages = [...messages, userMessage];

    if (nextIndex < PREDEFINED_QUESTIONS.length) {
      const nextQ = PREDEFINED_QUESTIONS[nextIndex];
      const botNextQuestion: ChatMessage = {
        id: `q_${nextIndex}_${Date.now()}`,
        sender: 'bot',
        text: `**Question ${nextIndex + 1} of 10:** ${nextQ.title}${nextQ.isMultiSelect ? ' *(Select all that apply)*' : ''}\n*${nextQ.subtitle}*`,
        isQuestion: true,
        questionIndex: nextIndex,
        timestamp: Date.now() + 10,
      };
      setMessages([...newMessages, botNextQuestion]);
    } else {
      setAssessmentComplete(true);
      const completionMessage: ChatMessage = {
        id: `comp_${Date.now()}`,
        sender: 'bot',
        text: '🎉 **All 10 questions completed!**\n\nI have gathered your complete health profile. Click below to generate your **Personalized 7-Day Diet & Exercise Plan** formatted into clean tables and ready to download as a PDF.',
        timestamp: Date.now() + 10,
      };
      setMessages([...newMessages, completionMessage]);
    }

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const downloadPlanFile = async (plan?: StructuredDietPlanResult, category?: string) => {
    if (!plan) return;
    const cleanCategory = (category || plan.category || 'Plan').replace(/\s+/g, '_');
    const fileName = `Medi_AI_7_Day_Plan_${cleanCategory}.html`;
    const html = aiDietService.generatePlanPdfHtml(plan);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      try {
        const FileSystem = require('expo-file-system');
        const Sharing = require('expo-sharing');
        const fileUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, html, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/html',
            dialogTitle: 'Save / Share Diet Plan',
            UTI: 'public.html',
          });
        }
      } catch (err) {
        console.error('Failed to download/share diet plan on mobile:', err);
      }
    }
  };

  const printOrSavePdf = (plan?: StructuredDietPlanResult, category?: string) => {
    if (!plan) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups in your browser to download / print your plan as PDF.');
        return;
      }
      const fullHtml = aiDietService.generatePlanPdfHtml(plan);
      printWindow.document.write(fullHtml);
      printWindow.document.close();
    } else {
      // On mobile, trigger file download/share
      downloadPlanFile(plan, category);
    }
  };

  const handleGeneratePlan = async () => {
    setGenerating(true);
    try {
      const result = await aiDietService.generateDietPlan(answers);

      const planMessage: ChatMessage = {
        id: `plan_${Date.now()}`,
        sender: 'bot',
        text: `7-Day ${result.category} Formulated`,
        isDietPlan: true,
        planData: result,
        dietCategory: result.category,
        timestamp: Date.now(),
      };

      const followUpPromptMessage: ChatMessage = {
        id: `followup_prompt_${Date.now()}`,
        sender: 'bot',
        text: '💡 **Need any adjustments or substitutions?**\nFeel free to ask questions below (e.g., *"Can I replace eggs with sattu?"*, *"What exercises can I do if my knees hurt?"*).',
        timestamp: Date.now() + 10,
      };

      setMessages((prev) => [...prev, planMessage, followUpPromptMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'bot',
        text: `⚠️ **Generation Error:** ${err.message || 'Could not generate plan. Please verify your Gemini API key.'}\n\nYou can click **Restart Assessment** to try again.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setGenerating(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  };

  const handleSendFollowUp = async () => {
    if (!followUpInput.trim() || followUpLoading) return;

    const userText = followUpInput.trim();
    setFollowUpInput('');

    const userMsg: ChatMessage = {
      id: `user_followup_${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setFollowUpLoading(true);

    try {
      // Build history for Gemini
      const history = messages
        .filter((m) => !m.isQuestion)
        .slice(-8)
        .map((m) => ({
          role: (m.sender === 'bot' ? 'model' : 'user') as 'model' | 'user',
          text: m.text,
        }));

      const botReplyText = await aiDietService.sendFollowUpQuestion(history, userText);

      const botReplyMsg: ChatMessage = {
        id: `bot_reply_${Date.now()}`,
        sender: 'bot',
        text: botReplyText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botReplyMsg]);
    } catch (err: any) {
      const errorReply: ChatMessage = {
        id: `bot_err_${Date.now()}`,
        sender: 'bot',
        text: `⚠️ Could not get AI response: ${err.message || 'Please check your connection.'}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorReply]);
    } finally {
      setFollowUpLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedPlan(true);
      setTimeout(() => setCopiedPlan(false), 2500);
    }
  };

  const content = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.surface : '#F8FAFC',
          borderColor: colors.border,
        },
      ]}>
      {/* Top App Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
            borderBottomColor: colors.border,
            paddingHorizontal: isMobile ? Spacing.three : Spacing.four,
            paddingVertical: isMobile ? Spacing.two + 2 : Spacing.three,
          },
        ]}>
        <View style={styles.headerTitleRow}>
          <View
            style={[
              styles.headerIconBadge,
              {
                backgroundColor: colors.primaryLight,
                width: isMobile ? 32 : 38,
                height: isMobile ? 32 : 38,
                borderRadius: isMobile ? 16 : 19,
              },
            ]}>
            <SparklesIcon size={isMobile ? 16 : 20} color={colors.primary} />
          </View>
          <View style={styles.headerTextGroup}>
            <Text style={[styles.headerTitle, { color: colors.text, fontSize: isMobile ? 14 : 16 }]}>
              Medi-AI Diet & Fitness Coach
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.headerSubtitle, { color: colors.textSecondary, fontSize: isMobile ? 11 : 12 }]}>
              Affordable Middle-Class Diet & Exercise Plans • Gemini AI
            </Text>
          </View>
        </View>

        <View style={styles.headerActionRow}>
          <Pressable
            onPress={resetChat}
            style={[styles.headerBtn, { borderColor: colors.border }]}>
            <RefreshCwIcon size={14} color={colors.textSecondary} />
            <Text style={[styles.headerBtnText, { color: colors.textSecondary }]}>Reset</Text>
          </Pressable>

          {!isFullScreenTab && (
            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9' }]}>
              <CloseIcon size={16} color={colors.text} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Progress Bar (Visible during assessment) */}
      {!assessmentComplete && currentQuestionIndex < PREDEFINED_QUESTIONS.length && (
        <View style={[styles.progressBarContainer, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: colors.primary,
                width: `${((currentQuestionIndex + 1) / PREDEFINED_QUESTIONS.length) * 100}%`,
              },
            ]}
          />
        </View>
      )}

      {/* Scrollable Chat Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatScroll}
        contentContainerStyle={[styles.chatContent, isMobile && { padding: Spacing.three, gap: Spacing.three }]}
        keyboardShouldPersistTaps="handled">
        {messages.map((msg, index) => {
          const isBot = msg.sender === 'bot';

          return (
            <View
              key={msg.id || index}
              style={[
                styles.messageRow,
                isBot ? styles.botMessageRow : styles.userMessageRow,
              ]}>
              {/* Bot Avatar */}
              {isBot && (
                <View style={[styles.botAvatar, { backgroundColor: colors.primaryLight }]}>
                  <DietIcon size={16} color={colors.primary} />
                </View>
              )}

              <View
                style={[
                  styles.bubbleWrapper,
                  { maxWidth: isMobile ? '96%' : '85%' },
                  !isBot && { alignItems: 'flex-end' },
                ]}>
                {/* Diet Plan Card: Clean summary with PDF download and NO wall of text preview */}
                {msg.isDietPlan && msg.planData ? (
                  <View
                    style={[
                      styles.planContainerCard,
                      {
                        backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
                        borderColor: colors.border,
                      },
                    ]}>
                    {/* Header with Classification Badge */}
                    <View style={styles.planCardHeader}>
                      <View
                        style={[
                          styles.categoryTag,
                          {
                            backgroundColor:
                              msg.dietCategory === 'GAIN DIET'
                                ? '#065F46'
                                : msg.dietCategory === 'LOSS DIET'
                                ? '#9A3412'
                                : '#1E40AF',
                          },
                        ]}>
                        <Text style={styles.categoryTagText}>
                          🎯 {msg.dietCategory}
                        </Text>
                      </View>
                      <Text style={[styles.planSuccessTitle, { color: colors.text }]}>
                        7-Day Nutrition & Fitness Schedule Formulated
                      </Text>
                    </View>

                    {/* Concise Summary without essays */}
                    <Text style={[styles.planSummaryText, { color: colors.textSecondary }]}>
                      {msg.planData.summary}
                    </Text>

                    {/* Highlights Badges */}
                    <View style={styles.highlightsGrid}>
                      <View style={[styles.highlightPill, { backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9' }]}>
                        <Text style={styles.highlightEmoji}>🍽️</Text>
                        <Text style={[styles.highlightText, { color: colors.text }]}>
                          Table 1: 7-Day Food Schedule (Breakfast to Dinner)
                        </Text>
                      </View>
                      <View style={[styles.highlightPill, { backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9' }]}>
                        <Text style={styles.highlightEmoji}>🧘</Text>
                        <Text style={[styles.highlightText, { color: colors.text }]}>
                          Table 2: 3-4 Daily Exercises with Yoga & Meditation
                        </Text>
                      </View>
                      <View style={[styles.highlightPill, { backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9' }]}>
                        <Text style={styles.highlightEmoji}>💰</Text>
                        <Text style={[styles.highlightText, { color: colors.text }]}>
                          Middle-Class Affordable Staples (Dal, Roti, Rice, Sattu, Besan, Sabzi)
                        </Text>
                      </View>
                    </View>

                    {/* Action Buttons: PDF Download is primary */}
                    <View style={styles.planPrimaryActions}>
                      <Pressable
                        onPress={() => printOrSavePdf(msg.planData, msg.dietCategory)}
                        style={[styles.pdfPrimaryBtn, { backgroundColor: colors.primary }]}>
                        <FileTextIcon size={18} color="#FFFFFF" />
                        <Text style={styles.pdfPrimaryBtnText}>
                          📄 Download / Print Plan as PDF
                        </Text>
                      </Pressable>

                      <View style={styles.planSecondaryRow}>
                        <Pressable
                          onPress={() => downloadPlanFile(msg.planData, msg.dietCategory)}
                          style={[
                            styles.actionBtn,
                            {
                              backgroundColor: isDark ? colors.surfaceHighlight : '#F8FAFC',
                              borderColor: colors.border,
                            },
                          ]}>
                          <DownloadIcon size={14} color={colors.primary} />
                          <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                            Save HTML Document
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => toggleTablePreview(msg.id)}
                          style={[
                            styles.actionBtn,
                            {
                              backgroundColor: isDark ? colors.surfaceHighlight : '#F8FAFC',
                              borderColor: colors.border,
                            },
                          ]}>
                          <Text style={{ fontSize: 13 }}>{tablePreviewOpen[msg.id] ? '🙈' : '👁️'}</Text>
                          <Text style={[styles.actionBtnText, { color: colors.text }]}>
                            {tablePreviewOpen[msg.id] ? 'Hide Tables' : 'Preview Tables in App'}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => copyToClipboard(JSON.stringify(msg.planData, null, 2))}
                          style={[
                            styles.actionBtn,
                            {
                              backgroundColor: isDark ? colors.surfaceHighlight : '#F8FAFC',
                              borderColor: colors.border,
                            },
                          ]}>
                          {copiedPlan ? (
                            <>
                              <CheckIcon size={14} color={colors.success} />
                              <Text style={[styles.actionBtnText, { color: colors.success }]}>
                                Copied!
                              </Text>
                            </>
                          ) : (
                            <>
                              <CopyIcon size={14} color={colors.textSecondary} />
                              <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>
                                Copy Data
                              </Text>
                            </>
                          )}
                        </Pressable>
                      </View>
                    </View>

                    {/* In-app Table Preview (ONLY IF EXPANDED) */}
                    {tablePreviewOpen[msg.id] && (
                      <View style={styles.tablePreviewContainer}>
                        {/* Table 1: Food Schedule */}
                        <Text style={[styles.tableSectionTitle, { color: colors.text }]}>
                          🍽️ Table 1: 7-Day Food Schedule
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
                          <View style={styles.tableBox}>
                            <View style={[styles.tableRow, styles.tableHeaderRow]}>
                              <Text style={[styles.tableHeaderCell, { width: 90 }]}>Day</Text>
                              <Text style={[styles.tableHeaderCell, { width: 140 }]}>🌅 Early Morning</Text>
                              <Text style={[styles.tableHeaderCell, { width: 150 }]}>🥣 Breakfast</Text>
                              <Text style={[styles.tableHeaderCell, { width: 140 }]}>🍎 Mid-Morning</Text>
                              <Text style={[styles.tableHeaderCell, { width: 180 }]}>🍛 Lunch</Text>
                              <Text style={[styles.tableHeaderCell, { width: 140 }]}>☕ Evening Snack</Text>
                              <Text style={[styles.tableHeaderCell, { width: 180 }]}>🍲 Dinner</Text>
                              <Text style={[styles.tableHeaderCell, { width: 130 }]}>🥛 Bedtime</Text>
                            </View>
                            {msg.planData.weeklyDiet.map((dayPlan, dIdx) => (
                              <View
                                key={dIdx}
                                style={[
                                  styles.tableRow,
                                  { backgroundColor: dIdx % 2 === 0 ? (isDark ? colors.surface : '#FFFFFF') : (isDark ? colors.surfaceHighlight : '#F8FAFC') },
                                ]}>
                                <Text style={[styles.tableCell, styles.dayCellText, { width: 90, color: colors.text }]}>{dayPlan.day}</Text>
                                <Text style={[styles.tableCell, { width: 140, color: colors.textSecondary }]}>{dayPlan.earlyMorning}</Text>
                                <Text style={[styles.tableCell, { width: 150, color: colors.textSecondary }]}>{dayPlan.breakfast}</Text>
                                <Text style={[styles.tableCell, { width: 140, color: colors.textSecondary }]}>{dayPlan.midMorning}</Text>
                                <Text style={[styles.tableCell, { width: 180, color: colors.text, fontWeight: '600' }]}>{dayPlan.lunch}</Text>
                                <Text style={[styles.tableCell, { width: 140, color: colors.textSecondary }]}>{dayPlan.eveningSnack}</Text>
                                <Text style={[styles.tableCell, { width: 180, color: colors.text, fontWeight: '600' }]}>{dayPlan.dinner}</Text>
                                <Text style={[styles.tableCell, { width: 130, color: colors.textSecondary }]}>{dayPlan.bedtime}</Text>
                              </View>
                            ))}
                          </View>
                        </ScrollView>

                        {/* Table 2: 3-4 Focused Daily Exercises with Yoga & Meditation */}
                        <Text style={[styles.tableSectionTitle, { color: colors.text, marginTop: Spacing.four }]}>
                          🧘 Table 2: Daily Exercises with Yoga & Meditation (3-4 Focus Routines)
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
                          <View style={styles.tableBox}>
                            <View style={[styles.tableRow, styles.tableHeaderRow]}>
                              <Text style={[styles.tableHeaderCell, { width: 40, textAlign: 'center' }]}>#</Text>
                              <Text style={[styles.tableHeaderCell, { width: 180 }]}>Exercise / Yoga Routine</Text>
                              <Text style={[styles.tableHeaderCell, { width: 170 }]}>⏰ Timings & Duration</Text>
                              <Text style={[styles.tableHeaderCell, { width: 260 }]}>Specific Routine Steps</Text>
                              <Text style={[styles.tableHeaderCell, { width: 180 }]}>Primary Benefit</Text>
                            </View>
                            {(msg.planData.exercises && msg.planData.exercises.length > 0
                              ? msg.planData.exercises
                              : [
                                  {
                                    name: 'Surya Namaskar & Yoga Asanas',
                                    timing: '6:30 AM - 6:50 AM (Morning)',
                                    duration: '15-20 Mins',
                                    routine: '5-7 rounds Surya Namaskar + Tadasana, Bhujangasana & Vrikshasana',
                                    benefits: 'Spine flexibility, joint mobility & core strength',
                                  },
                                  {
                                    name: 'Brisk Walking / Light Jogging',
                                    timing: '6:50 AM - 7:15 AM or Evening 5:30 PM',
                                    duration: '20-25 Mins',
                                    routine: 'Continuous brisk walking (3,000-4,000 steps) at steady pace',
                                    benefits: 'Cardiovascular heart conditioning & active calorie burn',
                                  },
                                  {
                                    name: 'Pranayama (Breathing Exercises)',
                                    timing: '7:15 AM - 7:25 AM',
                                    duration: '10 Mins',
                                    routine: '5 mins Anulom Vilom + 5 mins gentle Kapalbhati',
                                    benefits: 'Lung capacity expansion & nervous system balance',
                                  },
                                  {
                                    name: 'Mindfulness Meditation & Relaxation',
                                    timing: '9:30 PM - 9:45 PM (Bedtime)',
                                    duration: '10-15 Mins',
                                    routine: 'Silent breath observation, 4-4-4-4 box breathing & Shavasana',
                                    benefits: 'Lowers cortisol, calms mind & ensures deep restful sleep',
                                  },
                                ]
                            ).map((exItem, eIdx) => (
                              <View
                                key={eIdx}
                                style={[
                                  styles.tableRow,
                                  {
                                    backgroundColor:
                                      eIdx % 2 === 0
                                        ? (isDark ? colors.surface : '#FFFFFF')
                                        : (isDark ? colors.surfaceHighlight : '#F8FAFC'),
                                  },
                                ]}>
                                <Text
                                  style={[
                                    styles.tableCell,
                                    { width: 40, textAlign: 'center', color: colors.primary, fontWeight: '700' },
                                  ]}>
                                  {eIdx + 1}
                                </Text>
                                <Text style={[styles.tableCell, styles.dayCellText, { width: 180, color: colors.text }]}>
                                  {exItem.name}
                                </Text>
                                <Text style={[styles.tableCell, { width: 170, color: colors.primary, fontWeight: '700' }]}>
                                  {exItem.timing}
                                  {'\n'}
                                  <Text style={{ color: colors.textSecondary, fontWeight: '500', fontSize: 10 }}>
                                    ⏱️ {exItem.duration}
                                  </Text>
                                </Text>
                                <Text style={[styles.tableCell, { width: 260, color: colors.textSecondary }]}>
                                  {exItem.routine}
                                </Text>
                                <Text style={[styles.tableCell, { width: 180, color: colors.success, fontWeight: '600' }]}>
                                  {exItem.benefits}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </ScrollView>
                      </View>
                    )}
                  </View>
                ) : (
                  /* Standard Bot or User Text Bubble */
                  <View
                    style={[
                      styles.messageBubble,
                      isBot
                        ? [
                            styles.botBubble,
                            {
                              backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
                              borderColor: colors.border,
                            },
                          ]
                        : [
                            styles.userBubble,
                            {
                              backgroundColor: colors.primary,
                            },
                          ],
                    ]}>
                    <Text
                      style={[
                        styles.messageText,
                        {
                          color: isBot ? colors.text : '#FFFFFF',
                        },
                      ]}>
                      {msg.text}
                    </Text>
                  </View>
                )}

                {/* Interactive MCQ Option Chips (shown right below the corresponding question) */}
                {msg.isQuestion &&
                  msg.questionIndex !== undefined &&
                  msg.questionIndex === currentQuestionIndex &&
                  !assessmentComplete && (
                    <View style={styles.optionsGrid}>
                      {PREDEFINED_QUESTIONS[msg.questionIndex].options.map((option) => {
                        const optionFullLabel = `${option.icon ? option.icon + ' ' : ''}${option.label}`;
                        const isSelected = selectedOptions.includes(optionFullLabel);

                        return (
                          <Pressable
                            key={option.id}
                            onPress={() =>
                              toggleOption(
                                PREDEFINED_QUESTIONS[msg.questionIndex!],
                                optionFullLabel
                              )
                            }
                            style={({ pressed }) => [
                              styles.optionCard,
                              {
                                backgroundColor: isSelected
                                  ? (isDark ? colors.primaryLight : '#EFF6FF')
                                  : (isDark ? colors.surfaceHighlight : '#FFFFFF'),
                                borderColor: isSelected
                                  ? colors.primary
                                  : (pressed ? colors.primary : colors.border),
                                borderWidth: isSelected ? 2 : 1,
                                opacity: pressed ? 0.85 : 1,
                              },
                            ]}>
                            <View style={styles.optionContentRow}>
                              {/* Selection Checkbox */}
                              <View
                                style={[
                                  styles.checkboxCircle,
                                  {
                                    backgroundColor: isSelected ? colors.primary : 'transparent',
                                    borderColor: isSelected ? colors.primary : colors.border,
                                  },
                                ]}>
                                {isSelected && <CheckIcon size={11} color="#FFFFFF" />}
                              </View>

                              {option.icon && (
                                <Text style={styles.optionIcon}>{option.icon}</Text>
                              )}
                              <View style={styles.optionTextCol}>
                                <Text
                                  style={[
                                    styles.optionLabel,
                                    {
                                      color: isSelected ? colors.primary : colors.text,
                                      fontWeight: isSelected ? '800' : '600',
                                    },
                                  ]}>
                                  {option.label}
                                </Text>
                                {option.sublabel && (
                                  <Text
                                    style={[
                                      styles.optionSublabel,
                                      { color: colors.textSecondary },
                                    ]}>
                                    {option.sublabel}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </Pressable>
                        );
                      })}

                      {/* Confirm & Continue Button for Current Question */}
                      <Pressable
                        onPress={() => confirmAndProceed(PREDEFINED_QUESTIONS[msg.questionIndex!])}
                        disabled={selectedOptions.length === 0}
                        style={[
                          styles.confirmSelectionBtn,
                          {
                            backgroundColor:
                              selectedOptions.length > 0
                                ? colors.primary
                                : (isDark ? colors.surfaceHighlight : '#CBD5E1'),
                            opacity: selectedOptions.length > 0 ? 1 : 0.6,
                          },
                        ]}>
                        <Text style={styles.confirmSelectionBtnText}>
                          {selectedOptions.length > 0
                            ? `✓ Confirm & Continue (${selectedOptions.length} Selected) ➔`
                            : (PREDEFINED_QUESTIONS[msg.questionIndex!].isMultiSelect
                                ? 'Select 1 or more options above'
                                : 'Select an option to continue')}
                        </Text>
                      </Pressable>
                    </View>
                  )}
              </View>
            </View>
          );
        })}

        {/* Generate Plan Button when all 10 questions are answered */}
        {assessmentComplete && !messages.some((m) => m.isDietPlan) && (
          <View style={styles.generateCardWrapper}>
            <Pressable
              onPress={handleGeneratePlan}
              disabled={generating}
              style={[
                styles.generatePlanBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: generating ? 0.7 : 1,
                },
              ]}>
              {generating ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.generateBtnText}>
                    ✨ Formulating your personalized plan with Gemini AI...
                  </Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <SparklesIcon size={18} color="#FFFFFF" />
                  <Text style={styles.generateBtnText}>
                    🚀 Generate My Diet & Exercise Plan Now
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        )}

        {/* Loading Indicator for Follow-up Chat */}
        {followUpLoading && (
          <View style={[styles.messageRow, styles.botMessageRow]}>
            <View style={[styles.botAvatar, { backgroundColor: colors.primaryLight }]}>
              <DietIcon size={16} color={colors.primary} />
            </View>
            <View
              style={[
                styles.messageBubble,
                styles.botBubble,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
                  borderColor: colors.border,
                },
              ]}>
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.generatingText, { color: colors.textSecondary }]}>
                  Consulting Gemini AI Nutritionist...
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Follow-Up Text Input Bar (Active once plan is generated) */}
      {messages.some((m) => m.isDietPlan) && (
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
              borderTopColor: colors.border,
            },
          ]}>
          <TextInput
            value={followUpInput}
            onChangeText={setFollowUpInput}
            placeholder="Ask follow-up questions (e.g. swap curd, knee-friendly yoga)..."
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={handleSendFollowUp}
            returnKeyType="send"
            style={[
              styles.textInput,
              {
                backgroundColor: isDark ? colors.surfaceHighlight : '#F8FAFC',
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
          />
          <Pressable
            onPress={handleSendFollowUp}
            disabled={!followUpInput.trim() || followUpLoading}
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  followUpInput.trim() && !followUpLoading
                    ? colors.primary
                    : isDark
                    ? colors.surfaceHighlight
                    : '#E2E8F0',
              },
            ]}>
            <SendIcon
              size={18}
              color={followUpInput.trim() && !followUpLoading ? '#FFFFFF' : colors.textMuted}
            />
          </Pressable>
        </View>
      )}
    </View>
  );

  if (isFullScreenTab) {
    return <View style={styles.fullScreenWrapper}>{content}</View>;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay, isMobile && styles.mobileModalOverlay]}>
        <View style={[styles.modalDialog, isMobile && styles.mobileModalDialog]}>{content}</View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  mobileModalOverlay: {
    padding: 0,
    justifyContent: 'flex-end',
  },
  modalDialog: {
    width: '100%',
    maxWidth: 820,
    height: '92%',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.xl,
  },
  mobileModalDialog: {
    width: '100%',
    maxWidth: '100%',
    height: '98%',
    borderRadius: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  fullScreenWrapper: {
    flex: 1,
    width: '100%',
    minHeight: 650,
  },
  container: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
  },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  headerBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarContainer: {
    height: 4,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  botMessageRow: {
    justifyContent: 'flex-start',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  botAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bubbleWrapper: {
    maxWidth: '85%',
  },
  messageBubble: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: BorderRadius.lg,
  },
  botBubble: {
    borderWidth: 1,
    borderTopLeftRadius: 4,
  },
  userBubble: {
    borderTopRightRadius: 4,
  },
  planBubble: {
    borderWidth: 1.5,
    padding: Spacing.five,
  },
  planContainerCard: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    padding: Spacing.four,
    width: '100%',
    ...Shadows.md,
  },
  planCardHeader: {
    marginBottom: Spacing.two,
  },
  planSuccessTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  planSummaryText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: Spacing.three,
  },
  highlightsGrid: {
    gap: 6,
    marginBottom: Spacing.four,
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
  },
  highlightEmoji: {
    fontSize: 14,
  },
  highlightText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  planPrimaryActions: {
    gap: Spacing.two,
  },
  pdfPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: BorderRadius.lg,
    elevation: 3,
  },
  pdfPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  planSecondaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tablePreviewContainer: {
    marginTop: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  tableSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: Spacing.two,
  },
  tableScroll: {
    marginVertical: 4,
  },
  tableBox: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableHeaderRow: {
    backgroundColor: '#0F172A',
  },
  tableHeaderCell: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#334155',
  },
  tableCell: {
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  dayCellText: {
    fontWeight: '800',
  },
  categoryTag: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.two,
    alignSelf: 'flex-start',
  },
  categoryTagText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  categoryTagSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 22,
  },
  planActionsBar: {
    marginTop: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  optionsGrid: {
    marginTop: Spacing.three,
    gap: Spacing.two,
    width: '100%',
  },
  optionCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmSelectionBtn: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    elevation: 2,
  },
  confirmSelectionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  optionContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  optionIcon: {
    fontSize: 22,
  },
  optionTextCol: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionSublabel: {
    fontSize: 12,
    marginTop: 2,
  },
  generateCardWrapper: {
    marginTop: Spacing.two,
    alignItems: 'center',
  },
  generatePlanBtn: {
    width: '100%',
    paddingVertical: Spacing.three + 2,
    paddingHorizontal: Spacing.four,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  generatingText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    fontSize: 14,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
