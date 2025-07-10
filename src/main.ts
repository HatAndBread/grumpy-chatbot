import {
  MLCEngine,
  type ChatCompletionMessageParam,
  type InitProgressReport,
} from '@mlc-ai/web-llm';
import type { Template } from 'dommie';
import app from 'dommie';
import './style.css';

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

const template = (_: Template) => {
  const modelIds = [
    'Hermes-3-Llama-3.1-8B-q4f32_1-MLC',
    'Hermes-3-Llama-3.1-8B-q4f16_1-MLC',
    'Hermes-3-Llama-3.2-3B-q4f32_1-MLC',
    'Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC',
    'Hermes-2-Pro-Llama-3-8B-q4f32_1-MLC',
    'Hermes-2-Pro-Mistral-7B-q4f16_1-MLC',
    'SmolLM2-135M-Instruct-q0f16-MLC',
    'gemma-2-9b-it-q4f32_1-MLC',
    'Llama-2-13b-chat-hf-q4f16_1-MLC',
    'gemma-2-2b-jpn-it-q4f32_1-MLC',
    'Qwen3-8B-q4f16_1-MLC',
    'Qwen3-8B-q4f32_1-MLC',
    'stablelm-2-zephyr-1_6b-q4f32_1-MLC',
    'RedPajama-INCITE-Chat-3B-v1-q4f32_1-MLC',
  ];
  const isLoadingText = (t: string | null) =>
    t ? t.toLowerCase().match(/loading/) : false;
  const isFinishedText = (t: string) => t.toLowerCase().match(/finish/);
  return _.component(({ state, ref, subscribe }) => {
    const selectedModel = state<string>(
      window.localStorage.getItem('selectedModel') || modelIds[0]
    );
    const engine = state<MLCEngine | null>(null);
    const downloadProgress = state<number | null>(null);
    const progressExplanation = state<string | null>(null);
    const modelLoaded = state<boolean>(false);
    const isLoading = state<boolean>(false);
    const systemThinking = state<boolean>(false);
    const showError = state<boolean>(false);
    const systemPrompt = state<string>(
      window.localStorage.getItem('systemPrompt') ||
        `You are a happy and cheerful assistant. Do not use emojis. Do not use markdown. Speak in the same language as the user.`
    );
    const userInputRef = ref();
    const system: Message = {
      role: 'system',
      content: systemPrompt.value,
    };
    const messages = state<Message[]>(
      window.localStorage.getItem('messages')
        ? JSON.parse(window.localStorage.getItem('messages')!)
        : [system]
    );

    subscribe(() => {
      window.localStorage.setItem('systemPrompt', systemPrompt.value);
      system.content = systemPrompt.value;
      if (messages.value[0]) messages.value[0] = system;
      window.localStorage.setItem('messages', JSON.stringify(messages.value));
    }, [systemPrompt]);

    subscribe(() => {
      window.localStorage.setItem('messages', JSON.stringify(messages.value));
    }, [messages]);

    subscribe(() => {
      window.localStorage.setItem('selectedModel', selectedModel.value);
    }, [selectedModel]);

    const handleModelChange = (e: Event) => {
      const target = e.target as HTMLSelectElement;
      selectedModel.value = target.value;
    };

    const scrollToBottom = () => {
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);
    };

    const submitQuestion = async (message: string) => {
      const tearDown = () => {
        systemThinking.value = false;
        const input = userInputRef() as HTMLInputElement;
        if (input) input.value = '';
        if (input) input.focus();
        scrollToBottom();
      };
      if (!engine.value) return tearDown();
      systemThinking.value = true;
      messages.value = [...messages.value, { role: 'user', content: message }];
      console.log(messages.value);
      scrollToBottom();
      const reply = await engine.value.chat.completions.create({
        messages: messages.value as ChatCompletionMessageParam[],
      });
      const content = reply.choices[0]?.message.content;
      if (!content) throw new Error('No Message');
      messages.value = [...messages.value, { role: 'assistant', content }];
      tearDown();
    };

    const getModel = async () => {
      if (!selectedModel.value) {
        return;
      }
      isLoading.value = true;
      downloadProgress.value = 0;
      progressExplanation.value = null;
      modelLoaded.value = false;
      const initProgressCallback = (progress: InitProgressReport) => {
        if (isLoadingText(progress.text)) {
          progressExplanation.value = progress.text;
          if (isFinishedText(progress.text)) modelLoaded.value = true;
        }
        downloadProgress.value = progress.progress;
        console.log('Model loading progress:', progress);
      };
      engine.value = new MLCEngine({
        initProgressCallback: initProgressCallback,
      });
      try {
        await engine.value.reload(selectedModel.value);
      } catch (error) {
        showError.value = true;
      } finally {
        isLoading.value = false;
        const userInput = userInputRef() as HTMLInputElement;
        if (userInput) userInput.focus();
      }
    };
    _.div(
      {
        style: {
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '1000px',
          margin: '0 auto',
        },
      },
      () => {
        _.h1({
          text: '🤖',
          style: { textAlign: 'center', fontSize: '80px', margin: '0' },
        });
        _.p(
          {
            style: { textAlign: 'center', padding: '0' },
          },
          () => {
            _.text(`This is an AI chatbot powered by `);
            _.a({
              text: 'WebLLM',
              href: 'https://webllm.mlc.ai/',
              target: '_blank',
            });
            _.text(
              `. All models run directly in your browser—no data is sent to a server.
Performance depends on your hardware; larger models may struggle without a powerful GPU.
You can switch models or change the system prompt at any time—even mid-conversation.
You can also edit or delete messages—yours or the bot's—and see how the model adapts.`
            );
            _.br();
            _.text(
              `日本語で会話したい場合は、gemma-2-2b-jpn-it-q4f32_1-MLCがおすすめです。`
            );
          }
        );
        _.div({ subscribe: showError }, () => {
          if (showError.value) {
            _.div(
              {
                style: {
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ff0000',
                  fontSize: '12px',
                  backgroundColor: '#f0f0f0',
                  padding: '10px',
                  borderRadius: '4px',
                },
              },
              () => {
                _.text(
                  'Web GPU is not supported on this browser. Please use a different browser.'
                );
              }
            );
          }
        });
        _.div({ subscribe: [systemPrompt, systemThinking, isLoading] }, () => {
          _.label({
            text: 'System Prompt',
            style: {
              display: 'block',
              marginBottom: '10px',
              fontSize: '12px',
              fontWeight: 'bold',
            },
          });
          _.textarea(
            {
              style: { width: '100%' },
              type: 'text',
              name: 'systemPrompt',
              value: systemPrompt.value,
              minHeight: '200px !important',
              placeholder: 'System Prompt',
              disabled: systemThinking.value || isLoading.value,
              input: (e: Event) => {
                const target = e.target as HTMLTextAreaElement;
                systemPrompt.value = target.value;
              },
            },
            () => {
              _.text(systemPrompt.value);
            }
          );
        });
        _.div(
          {
            style: {
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              justifyContent: 'center',
            },
          },
          () => {
            _.select(
              {
                change: handleModelChange,
              },
              () => {
                modelIds.forEach((id) => {
                  _.option({
                    id: `${id}-option`,
                    text: id,
                    value: id,
                    selected: selectedModel.value === id,
                  });
                });
              }
            );
            _.div(
              { subscribe: [selectedModel, isLoading, systemThinking] },
              () => {
                if (selectedModel.value) {
                  _.button({
                    style: { height: '100%' },
                    text: 'Download Model',
                    click: getModel,
                    disabled: isLoading.value || systemThinking.value,
                  });
                }
              }
            );
          }
        );
        _.div(
          {
            subscribe: [downloadProgress, progressExplanation],
            style: {
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
          },
          () => {
            downloadProgress.value === null ||
              isLoadingText(progressExplanation.value) ||
              _.text(
                `Download Progress: ${(downloadProgress.value * 100).toFixed(
                  2
                )}%`
              );
            if (isLoadingText(progressExplanation.value)) {
              _.div({}, () => {
                _.text(progressExplanation.value!);
              });
            }
          }
        );
        _.div({ subscribe: modelLoaded, style: { marginTop: '16px' } }, () => {
          if (modelLoaded.value) {
            _.div({ style: { display: 'flex', width: '100%' } }, () => {
              _.div({ style: { width: '100%' }, subscribe: messages }, () => {
                _.ul(
                  {
                    style: {
                      listStyle: 'none',
                      width: '100%',
                      margin: '0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      padding: '0',
                    },
                  },
                  () => {
                    messages.value.forEach((m, i) => {
                      if (m.role === 'system') return;
                      _.li(
                        {
                          id: m.content,
                          style: {
                            border: '1px solid #646cff',
                            backgroundColor:
                              m.role === 'user' ? 'transparent' : '#646cff',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            position: 'relative',
                          },
                        },
                        () => {
                          _.span(
                            {
                              subscribe: systemThinking,
                              style: {
                                padding: '0',
                                margin: '0',
                                position: 'relative',
                                top: '0',
                                left: 'calc(100% - 8px)',
                              },
                            },
                            () => {
                              _.button({
                                text: '✕',
                                disabled: systemThinking.value,
                                click: () => {
                                  messages.value = messages.value.filter(
                                    (_, index) => index !== i
                                  );
                                },
                                style: {
                                  padding: '0',
                                  margin: '0',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  color: 'white',
                                  fontSize: '16px',
                                },
                              });
                            }
                          );
                          _.component(({ afterMounted, ref }) => {
                            const textareaRef = ref();
                            afterMounted(() => {
                              setTimeout(() => {
                                const textarea =
                                  textareaRef() as HTMLTextAreaElement | null;
                                if (textarea) {
                                  textarea.style.height = 'auto !important';
                                  textarea.style.height =
                                    textarea.scrollHeight + 'px';
                                }
                              });
                            });
                            _.span({ subscribe: systemThinking }, () => {
                              _.textarea(
                                {
                                  class: 'no-shadow',
                                  disabled: systemThinking.value,
                                  ref: textareaRef,
                                  input: (e: Event) => {
                                    const target =
                                      e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height =
                                      target.scrollHeight + 'px';
                                    const message = messages.value[i];
                                    message.content = target.value;
                                  },
                                  style: {
                                    type: 'text',
                                    shadow: 'none !important',
                                    width: '100% !important',
                                    border: 'none !important',
                                    height: 'auto !important',
                                    backgroundColor: 'transparent',
                                    color:
                                      m.role === 'user' ? 'white' : 'black',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    textAlign:
                                      m.role === 'user' ? 'right' : 'left',
                                    padding: '0',
                                    margin: '0',
                                  },
                                },
                                () => {
                                  _.text(m.content);
                                }
                              );
                            });
                          });
                        }
                      );
                    });
                  }
                );
              });
            });
            _.div(
              {
                style: { display: 'flex', gap: '8px', marginTop: '16px' },
              },
              () => {
                _.div(
                  {
                    style: { width: '100%', display: 'flex' },
                    subscribe: systemThinking,
                  },
                  () => {
                    _.textarea({
                      style: { width: '100%' },
                      type: 'text',
                      name: 'message',
                      placeholder: 'Ask me anything...',
                      disabled: systemThinking.value,
                      ref: userInputRef,
                      input: (e: Event) => {
                        if (isLoading.value || systemThinking.value) return;
                        const target = e.target as HTMLTextAreaElement;
                        const lastChar = target.value[target.value.length - 1];
                        if (lastChar === '\n') {
                          target.value = target.value.slice(0, -1);
                          submitQuestion(target.value);
                        }
                      },
                    });
                  }
                );
                _.div({ subscribe: systemThinking }, () => {
                  _.button(
                    {
                      click: () => {
                        const input = userInputRef() as HTMLInputElement | null;
                        if (input?.value) submitQuestion(input.value);
                      },
                      disabled: systemThinking.value,
                      style: {
                        height: '100%',
                        minWidth: '112px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                    },
                    () => {
                      systemThinking.value
                        ? _.div({ class: 'loader' })
                        : _.text('Send');
                    }
                  );
                });
              }
            );
          }
        });

        _.span({ subscribe: [systemThinking, isLoading, messages] }, () => {
          if (
            systemThinking.value ||
            isLoading.value ||
            messages.value.every((m) => m.role === 'system') ||
            engine.value === null
          )
            return;
          _.button({
            text: 'Clear Messages',
            click: () => {
              window.localStorage.removeItem('messages');
              messages.value = [system];
            },
          });
        });
      }
    );
  });
};
app(template, '#app');
