// lib/notifications.tsx
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, FileText, Loader2 } from 'lucide-react';

export const showLessonCreatedNotification = () => {
  toast.custom(
    (t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <FileText className="h-10 w-10 text-blue-500" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">New Lesson Created</p>
              <p className="mt-1 text-sm text-gray-500">Generation started</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => toast.dismiss(t.id)} 
          className="border-l border-gray-200 p-4 text-indigo-600 hover:text-indigo-500 focus:outline-none"
        >
          Close
        </button>
      </div>
    ),
    { duration: 3000, position: 'bottom-right' }
  );
};

export const showLessonGeneratedNotification = () => {
  toast.custom(
    (t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">Lesson Generated!</p>
              <p className="mt-1 text-sm text-gray-500">Your lesson is ready to view</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => toast.dismiss(t.id)} 
          className="border-l border-gray-200 p-4 text-indigo-600 hover:text-indigo-500 focus:outline-none"
        >
          Close
        </button>
      </div>
    ),
    { duration: 5000, position: 'bottom-right' }
  );
};

export const showLessonErrorNotification = (errorMessage?: string) => {
  toast.custom(
    (t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">Generation Failed</p>
              <p className="mt-1 text-sm text-gray-500">
                {errorMessage || 'An error occurred during generation'}
              </p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => toast.dismiss(t.id)} 
          className="border-l border-gray-200 p-4 text-red-600 hover:text-red-500 focus:outline-none"
        >
          Close
        </button>
      </div>
    ),
    { duration: 6000, position: 'bottom-right' }
  );
};

export const showLessonGeneratingNotification = () => {
  toast.custom(
    (t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">Generating Lesson</p>
              <p className="mt-1 text-sm text-gray-500">Please wait...</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => toast.dismiss(t.id)} 
          className="border-l border-gray-200 p-4 text-indigo-600 hover:text-indigo-500 focus:outline-none"
        >
          Close
        </button>
      </div>
    ),
    { duration: 2000, position: 'bottom-right' }
  );
};