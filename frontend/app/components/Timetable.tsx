import React from "react";

interface TimetableItem {
  day: string;
  time: string;
  subject: string;
}

interface HeaderData {
  school: string;
  class: string;
  term: string;
  teacher: string;
}

interface StructuredData {
  header: HeaderData;
  timetable: TimetableItem[];
}

interface TimetableProps {
  data: StructuredData | null | undefined;
}

const Timetable: React.FC<TimetableProps> = ({ data }) => {
  // --------------------- NULL HANDLING ---------------------
  if (!data || !data.header || !data.timetable) {
    return (
      <div className="mx-auto p-6 bg-red-50 border border-red-300 rounded shadow text-center">
        <h2 className="text-xl font-semibold text-red-700 mb-2">
          ⚠️ No Data Available
        </h2>
        <p className="text-red-600">
          Please check your Gemini API key or the API response.
        </p>
      </div>
    );
  }
  // ---------------------------------------------------------

  const { header, timetable } = data;

  // Group timetable items by day
  const groupedByDay = timetable.reduce((acc, item) => {
    if (!acc[item.day]) {
      acc[item.day] = [];
    }
    acc[item.day].push(item);
    return acc;
  }, {} as Record<string, TimetableItem[]>);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  return (
    <div className="mx-auto p-6 bg-white rounded shadow-lg">
      {/* Header Section */}
      <div className="mb-8 text-center pb-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {header.school}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-600">
          <div>
            <span className="font-semibold">Class:</span> {header.class}
          </div>
          <div>
            <span className="font-semibold">Term:</span> {header.term}
          </div>
          <div>
            <span className="font-semibold">Teacher:</span> {header.teacher}
          </div>
        </div>
      </div>

      {/* Timetable Section */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                Day
              </th>
              <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                Time
              </th>
              <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                Subject
              </th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <React.Fragment key={day}>
                {groupedByDay[day]?.length ? (
                  groupedByDay[day].map((item, index) => (
                    <tr
                      key={`${day}-${index}`}
                      className={`hover:bg-gray-50 transition-colors duration-200 ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                    >
                      {index === 0 && (
                        <td
                          rowSpan={groupedByDay[day].length}
                          className="border border-gray-300 px-4 py-3 font-semibold text-gray-800 align-top"
                        >
                          {day}
                        </td>
                      )}
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">
                        {item.time || "-"}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">
                        {item.subject}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="border border-gray-300 px-4 py-3 font-semibold text-gray-700">
                      {day}
                    </td>
                    <td
                      className="border border-gray-300 px-4 py-3 text-gray-500"
                      colSpan={2}
                    >
                      No classes
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>
          Timetable generated for {header.class} - {header.term}
        </p>
      </div>
    </div>
  );
};

export default Timetable;
