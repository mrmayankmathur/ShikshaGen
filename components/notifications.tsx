import toast, { Toast } from 'react-hot-toast';
import {
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  X,
} from 'lucide-react';
import React from 'react';

interface NotificationToastProps {
  t: Toast; 
  Icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  title: string;
  message: string;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  t,
  Icon,
  iconColor,
  bgColor,
  title,
  message,
}) => {
  const animationClasses = t.visible
    ? 'translate-x-0 opacity-100'
    : 'translate-x-full opacity-0';

  return (
    <div
      className={`${animationClasses} 
      max-w-sm w-full bg-white shadow-2xl rounded-xl pointer-events-auto 
      ring-1 ring-black ring-opacity-5 
      transition-all duration-300 ease-in-out`}
    >
      <div className="flex items-start p-4">
        <div className="flex-shrink-0">
          <div
            className={`h-10 w-10 ${bgColor} rounded-full flex items-center justify-center`}
          >
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>

        {/* Text content */}
        <div className="ml-3 w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="mt-1 text-sm text-gray-600">{message}</p>
        </div>

        {/* Close button */}
        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="rounded-full p-1 inline-flex text-gray-400 hover:text-gray-600 hover:bg-gray-100
                       focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <span className="sr-only">Close</span>
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const showLessonCreatedNotification = () => {
  toast.custom(
    (t) => (
      <NotificationToast
        t={t}
        Icon={FileText}
        iconColor="text-blue-600"
        bgColor="bg-blue-100"
        title="New Lesson Created"
        message="Generation has started."
      />
    ),
    { duration: 3000 }
  );
};

export const showLessonGeneratedNotification = () => {
  toast.custom(
    (t) => (
      <NotificationToast
        t={t}
        Icon={CheckCircle2}
        iconColor="text-green-600"
        bgColor="bg-green-100"
        title="Lesson Generated!"
        message="Your lesson is ready to view."
      />
    ),
    { duration: 5000 }
  );
};

export const showLessonErrorNotification = (errorMessage?: string) => {
  toast.custom(
    (t) => (
      <NotificationToast
        t={t}
        Icon={XCircle}
        iconColor="text-red-600"
        bgColor="bg-red-100"
        title="Generation Failed"
        message={errorMessage || 'An error occurred during generation.'}
      />
    ),
    { duration: 6000 }
  );
};

export const showLessonGeneratingNotification = () => {
  toast.custom(
    (t) => (
      <NotificationToast
        t={t}
        Icon={Loader2}
        iconColor="text-blue-600 animate-spin"
        bgColor="bg-blue-100"
        title="Generating Lesson"
        message="Please wait..."
      />
    ),
    { duration: 2000 }
  );
};