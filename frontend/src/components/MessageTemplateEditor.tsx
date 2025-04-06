import { useState } from 'react';
import { PaperAirplaneIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface Message {
  type: 'text' | 'media';
  content: string;
  caption?: string;
}

interface MessageTemplateEditorProps {
  onSave: (title: string, messages: Message[]) => void;
  initialTitle?: string;
  initialMessages?: Message[];
}

export function MessageTemplateEditor({
  onSave,
  initialTitle = '',
  initialMessages = [],
}: MessageTemplateEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [currentMessage, setCurrentMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [isAddingMedia, setIsAddingMedia] = useState(false);

  const handleAddTextMessage = () => {
    if (!currentMessage.trim()) return;
    setMessages([...messages, { type: 'text', content: currentMessage }]);
    setCurrentMessage('');
  };

  const handleAddMediaMessage = () => {
    if (!mediaUrl.trim()) return;
    setMessages([
      ...messages,
      {
        type: 'media',
        content: mediaUrl,
        caption: mediaCaption.trim() || undefined,
      },
    ]);
    setMediaUrl('');
    setMediaCaption('');
    setIsAddingMedia(false);
  };

  const handleSave = () => {
    if (!title.trim() || messages.length === 0) return;
    onSave(title, messages);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Template Title */}
      <div className="p-4 border-b">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Template Title"
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Message Preview */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map((message, index) => (
          <div
            key={index}
            className="flex flex-col max-w-[80%] ml-auto bg-indigo-50 rounded-lg p-3"
          >
            {message.type === 'media' && (
              <div className="mb-2">
                <img
                  src={message.content}
                  alt="Media preview"
                  className="max-w-full rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-image.png';
                  }}
                />
                {message.caption && (
                  <p className="mt-2 text-sm text-gray-600">{message.caption}</p>
                )}
              </div>
            )}
            {message.type === 'text' && (
              <p className="text-gray-800">{message.content}</p>
            )}
          </div>
        ))}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t">
        {isAddingMedia ? (
          <div className="space-y-3">
            <input
              type="text"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="Media URL"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              value={mediaCaption}
              onChange={(e) => setMediaCaption(e.target.value)}
              placeholder="Caption (optional)"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsAddingMedia(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMediaMessage}
                className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Add Media
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddTextMessage();
                }
              }}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => setIsAddingMedia(true)}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <PhotoIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleAddTextMessage}
              className="p-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="p-4 border-t">
        <button
          onClick={handleSave}
          disabled={!title.trim() || messages.length === 0}
          className="w-full px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Template
        </button>
        <p className="mt-2 text-xs text-gray-500 text-center">
          When you save a template, messages will be sent to yourself first and their IDs stored for efficient batch sending.
        </p>
      </div>
    </div>
  );
}
