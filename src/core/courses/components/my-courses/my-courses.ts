// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { Searchbar } from 'ionic-angular';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreAppProvider, CoreAppSchema} from '@providers/app'
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreCoursesProvider, CoreCoursesMyCoursesUpdatedEventData } from '../../providers/courses';
import { CoreCoursesHelperProvider } from '../../providers/helper';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreCourseOptionsDelegate } from '@core/course/providers/options-delegate';
import { HttpClient } from '@angular/common/http';
import { CoreWSProvider } from '@providers/ws';
import { TranslateService } from '@ngx-translate/core';
import { SQLiteObject } from '@ionic-native/sqlite';
import { Platform } from 'ionic-angular';
import { SQLiteDB} from '@classes/sqlitedb';
/**
 * Component that displays the list of courses the user is enrolled in.
 */

@Component({
    selector: 'core-courses-my-courses',
    templateUrl: 'my-courses.html',
})
export class CoreCoursesMyCoursesComponent implements OnInit, OnDestroy {
    @ViewChild('searchbar') searchbar: Searchbar;

    db: SQLiteObject;
    protected appDB: SQLiteDB;
    protected dbReady: Promise<any>; // Promise resolved when the app DB is initialized.
    static USER_CATEGORY_COURSES_TABLE = 'user_category_courses'
    protected appTablesSchemaCourses: CoreAppSchema = {
        name: 'CoreCoursesMyCoursesComponent',
        version: 2,
        tables: [
            {
                name: CoreCoursesMyCoursesComponent.USER_CATEGORY_COURSES_TABLE,
                columns: [
                    {
                        name: 'admOptions',
                        type: 'TEXT'
                    },
                    {
                        name: 'cacherev',
                        type: 'TEXT'
                    },
                    {
                        name: 'calendartype',
                        type: 'TEXT'
                    },
                    {
                        name: 'category',
                        type: 'TEXT'
                    },
                    {
                        name: 'completionnotify',
                        type: 'TEXT'
                    },
                    {
                        name: 'courseImage',
                        type: 'TEXT'
                    },
                    {
                        name: 'defaultgroupingid',
                        type: 'TEXT'
                    },
                    {
                        name: 'enablecompletion',
                        type: 'TEXT'
                    },
                    {
                        name: 'enddate',
                        type: 'TEXT'
                    },
                    {
                        name: 'format',
                        type: 'TEXT'
                    },
                    {
                        name: 'fullname',
                        type: 'TEXT'
                    },
                    {
                        name: 'groupmode',
                        type: 'TEXT'
                    },
                    {
                        name: 'groupmodeforce',
                        type: 'TEXT'
                    },
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true
                    },
                    {
                        name: 'idnumber',
                        type: 'TEXT'
                    },
                    {
                        name: 'lang',
                        type: 'TEXT'
                    },
                    {
                        name: 'legacyfiles',
                        type: 'TEXT'
                    },
                    {
                        name: 'marker',
                        type: 'TEXT'
                    },
                    {
                        name: 'maxbytes',
                        type: 'TEXT'
                    },
                    {
                        name: 'navOptions',
                        type: 'TEXT'
                    },
                    {
                        name: 'newsitems',
                        type: 'TEXT'
                    },
                    {
                        name: 'relativedatesmode',
                        type: 'TEXT'
                    },
                    {
                        name: 'requested',
                        type: 'TEXT'
                    },
                    {
                        name: 'role',
                        type: 'TEXT'
                    },
                    {
                        name: 'rolename',
                        type: 'INTEGER'
                    },
                    {
                        name: 'shortname',
                        type: 'TEXT'
                    },
                    {
                        name: 'showgrades',
                        type: 'TEXT'
                    },
                    {
                        name: 'showreports',
                        type: 'TEXT'
                    },
                    {
                        name: 'sortorder',
                        type: 'TEXT'
                    },
                    {
                        name: 'startdate',
                        type: 'TEXT'
                    },
                    {
                        name: 'summary',
                        type: 'TEXT'
                    },
                    {
                        name: 'summaryformat',
                        type: 'TEXT'
                    },
                    {
                        name: 'theme',
                        type: 'TEXT'
                    },
                    {
                        name: 'timecreated',
                        type: 'TEXT'
                    },
                    {
                        name: 'timemodified',
                        type: 'TEXT'
                    },
                    {
                        name: 'visible',
                        type: 'TEXT'
                    },
                    {
                        name: 'visibleold',
                        type: 'TEXT'
                    },
                    {
                        name: 'studentid',
                        type: 'TEXT'
                    },
                    {
                        name: 'siteid',
                        type: 'TEXT'
                    },
                ]
            }
        ]
    };

    courses: any[];
    userCategoryCourses:any[];
    filteredCourses: any[];
    searchEnabled: boolean;
    filter = '';
    showFilter = false;
    coursesLoaded = false;
    prefetchCoursesData: any = {};
    downloadAllCoursesEnabled: boolean;
    protected prefetchIconInitialized = false;
    protected myCoursesObserver;
    protected siteUpdatedObserver;
    protected isDestroyed = false;
    protected courseIds = '';
    userId: number;
    userCategoryId = 0;

    constructor(private platform: Platform,private navCtrl: NavController, navParams: NavParams,private coursesProvider: CoreCoursesProvider,
            private domUtils: CoreDomUtilsProvider, private eventsProvider: CoreEventsProvider,private appProvider: CoreAppProvider,
            private sitesProvider: CoreSitesProvider, private courseHelper: CoreCourseHelperProvider,
            private courseOptionsDelegate: CoreCourseOptionsDelegate, private coursesHelper: CoreCoursesHelperProvider,
            public httpClient: HttpClient,protected wsProvider: CoreWSProvider,protected translate: TranslateService) { 
                this.userCategoryId = navParams.get('cateId') || 0;
                this.appDB = appProvider.getDB();
                this.dbReady = appProvider.createTablesFromSchema(this.appTablesSchemaCourses).catch(() => {
                    // Ignore errors.
                });
            }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.searchEnabled = !this.coursesProvider.isSearchCoursesDisabledInSite();
        this.downloadAllCoursesEnabled = !this.coursesProvider.isDownloadCoursesDisabledInSite();

        if (!this.appProvider.isOnline()) {
            this.coursesLoaded = true;
            this.syncAllcourses();
        } else {
            this.fetchUserCategoryCourses().finally(() => {
                this.coursesLoaded = true;
            });
        }       
        // Update list if user enrols in a course.
        this.myCoursesObserver = this.eventsProvider.on(CoreCoursesProvider.EVENT_MY_COURSES_UPDATED,
                (data: CoreCoursesMyCoursesUpdatedEventData) => {

            if (data.action == CoreCoursesProvider.ACTION_ENROL) {
                this.fetchUserCategoryCourses();
            }
        }, this.sitesProvider.getCurrentSiteId());

        // Refresh the enabled flags if site is updated.
        this.siteUpdatedObserver = this.eventsProvider.on(CoreEventsProvider.SITE_UPDATED, () => {
            const wasEnabled = this.downloadAllCoursesEnabled;

            this.searchEnabled = !this.coursesProvider.isSearchCoursesDisabledInSite();
            this.downloadAllCoursesEnabled = !this.coursesProvider.isDownloadCoursesDisabledInSite();

            if (!wasEnabled && this.downloadAllCoursesEnabled && this.coursesLoaded) {
                // Download all courses is enabled now, initialize it.
                this.initPrefetchCoursesIcon();
            }
        }, this.sitesProvider.getCurrentSiteId());
    }

    /**
     * Fetch the user courses.
     *
     * @return Promise resolved when done.
     */
    protected fetchCourses(): Promise<any> {
        return this.coursesProvider.getUserCourses().then((courses) => {
            const promises = [],
                courseIds = courses.map((course) => {
                return course.id;
            });

            this.courseIds = courseIds.join(',');
            promises.push(this.coursesHelper.loadCoursesExtraInfo(courses));

            if (this.coursesProvider.canGetAdminAndNavOptions()) {
                promises.push(this.coursesProvider.getCoursesAdminAndNavOptions(courseIds).then((options) => {
                    courses.forEach((course) => {
                        course.navOptions = options.navOptions[course.id];
                        course.admOptions = options.admOptions[course.id];
                    });
                }));
            }

            return Promise.all(promises).then(() => {
                this.courses = courses;
                this.filteredCourses = this.courses;
                this.filter = '';
                this.initPrefetchCoursesIcon();
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.courses.errorloadcourses', true);
        });
    }

    fetchUserCategoryCourses(): Promise<any>{
        let siteInfo = this.sitesProvider.getCurrentSite()
        this.userId = this.sitesProvider.getCurrentSiteUserId();

        const params = {
            wstoken: siteInfo.token,
            wsfunction:"local_sms_get_subcategorywise_courses",
            moodlewsrestformat:"json",
            userid:this.userId,
            catid:this.userCategoryId
        },
        userCategoryCoursesUrl = siteInfo.siteUrl +'/webservice/rest/server.php?',
        promise = this.httpClient.post(userCategoryCoursesUrl, params).timeout(this.wsProvider.getRequestTimeout()).toPromise();

        return promise.then((data: any): any => {
            if (typeof data == 'undefined') {
                return Promise.reject(this.translate.instant('core.cannotconnecttrouble'));
            } else {
                let courses = data.courses;
                const promises = [],courseIds = courses.map((course) => {
                    return course.id;
                });
                this.courseIds = courseIds.join(',');
                if (this.coursesProvider.canGetAdminAndNavOptions()) {
                    promises.push(this.coursesProvider.getCoursesAdminAndNavOptions(courseIds).then((options) => {
                        courses.forEach((course) => {
                            course.navOptions = options.navOptions[course.id];
                            course.admOptions = options.admOptions[course.id];
                        });
                    }));
                }
                this.courses = courses;
                this.filteredCourses = this.courses;
                this.insertCoursesListToDB(this.courses);
                this.filter = '';
                this.initPrefetchCoursesIcon();
                return courses;
            }
        }).catch((error) => { 
            this.domUtils.showErrorModalDefault(error, 'core.courses.errorloadcourses', true);
            return Promise.reject(this.translate.instant('core.cannotconnecttrouble'));
        });

    } 

    /**
     * Refresh the courses.
     *
     * @param refresher Refresher.
     */
    refreshCourses(refresher: any): void {
        const promises = [];

        promises.push(this.coursesProvider.invalidateUserCourses());
        promises.push(this.courseOptionsDelegate.clearAndInvalidateCoursesOptions());
        if (this.courseIds) {
            promises.push(this.coursesProvider.invalidateCoursesByField('ids', this.courseIds));
        }

        Promise.all(promises).finally(() => {

            this.prefetchIconInitialized = false;
            this.fetchUserCategoryCourses().finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * Show or hide the filter.
     */
    switchFilter(): void {
        this.filter = '';
        this.showFilter = !this.showFilter;
        this.filteredCourses = this.courses;
        if (this.showFilter) {
            setTimeout(() => {
                this.searchbar.setFocus();
            }, 500);
        }
    }

    /**
     * The filter has changed.
     *
     * @param Received Event.
     */
    filterChanged(event: any): void {
        const newValue = event.target.value && event.target.value.trim().toLowerCase();
        if (!newValue || !this.courses) {
            this.filteredCourses = this.courses;
        } else {
            // Use displayname if avalaible, or fullname if not.
            if (this.courses.length > 0 && typeof this.courses[0].displayname != 'undefined') {
                this.filteredCourses = this.courses.filter((course) => {
                    return course.displayname.toLowerCase().indexOf(newValue) > -1;
                });
            } else {
                this.filteredCourses = this.courses.filter((course) => {
                    return course.fullname.toLowerCase().indexOf(newValue) > -1;
                });
            }
        }
    }

    /**
     * Prefetch all the courses.
     *
     * @return Promise resolved when done.
     */
    prefetchCourses(): Promise<any> {
        const initialIcon = this.prefetchCoursesData.icon;

        this.prefetchCoursesData.icon = 'spinner';
        this.prefetchCoursesData.badge = '';

        return this.courseHelper.confirmAndPrefetchCourses(this.courses, (progress) => {
            this.prefetchCoursesData.badge = progress.count + ' / ' + progress.total;
        }).then(() => {
            this.prefetchCoursesData.icon = 'ion-android-refresh';
        }).catch((error) => {
            if (!this.isDestroyed) {
                this.domUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
                this.prefetchCoursesData.icon = initialIcon;
            }
        }).finally(() => {
            this.prefetchCoursesData.badge = '';
        });
    }

    /**
     * Initialize the prefetch icon for the list of courses.
     */
    protected initPrefetchCoursesIcon(): void {
        if (this.prefetchIconInitialized || !this.downloadAllCoursesEnabled) {
            // Already initialized.
            return;
        }

        this.prefetchIconInitialized = true;

        if (!this.courses || this.courses.length < 2) {
            // Not enough courses.
            this.prefetchCoursesData.icon = '';

            return;
        }

        this.courseHelper.determineCoursesStatus(this.courses).then((status) => {
            let icon = this.courseHelper.getCourseStatusIconAndTitleFromStatus(status).icon;
            if (icon == 'spinner') {
                // It seems all courses are being downloaded, show a download button instead.
                icon = 'cloud-download';
            }
            this.prefetchCoursesData.icon = icon;
        });
    }


    async insertCoursesListToDB(courseArray): Promise<void> {
        await this.dbReady;
        let siteInfo = this.sitesProvider.getCurrentSite()
        let userId = this.sitesProvider.getCurrentSiteUserId();
        let siteId = siteInfo.id;
        for(let key = 0; key < courseArray.length; key++){
            const entrycourses = {
                    admOptions: courseArray[key].admOptions,
                    cacherev: courseArray[key].cacherev,
                    calendartype: courseArray[key].calendartype,
                    category: courseArray[key].category,
                    completionnotify: courseArray[key].completionnotify,
                    courseImage: courseArray[key].courseImage,
                    defaultgroupingid: courseArray[key].defaultgroupingid,
                    enablecompletion: courseArray[key].enablecompletion,
                    enddate: courseArray[key].enddate,
                    format: courseArray[key].format,
                    fullname: courseArray[key].fullname,
                    groupmode: courseArray[key].groupmode,
                    groupmodeforce: courseArray[key].groupmodeforce,
                    id: courseArray[key].id,
                    idnumber: courseArray[key].idnumber,
                    lang: courseArray[key].lang,
                    legacyfiles: courseArray[key].legacyfiles,
                    marker: courseArray[key].marker,
                    maxbytes: courseArray[key].maxbytes,
                    navOptionsnewsitems: courseArray[key].navOptionsnewsitems,
                    relativedatesmode: courseArray[key].relativedatesmode,
                    requested: courseArray[key].requested,
                    role: courseArray[key].role,
                    rolename: courseArray[key].rolename,
                    shortname: courseArray[key].shortname,
                    showgrades: courseArray[key].showgrades,
                    showreports: courseArray[key].showreports,
                    sortorder: courseArray[key].sortorder,
                    startdate: courseArray[key].startdate,
                    summary: courseArray[key].summary,
                    summaryformat: courseArray[key].summaryformat,
                    theme: courseArray[key].theme,
                    timecreated: courseArray[key].timecreated,
                    timemodified: courseArray[key].timemodified,
                    visible: courseArray[key].visible,
                    visibleold: courseArray[key].visibleold,
                    studentid: userId,
                    siteid: siteId
            };
            await this.appDB.insertRecordCategory(CoreCoursesMyCoursesComponent.USER_CATEGORY_COURSES_TABLE, (entrycourses));
        }
    }

    protected syncAllcourses(): Promise<any> {
        let userId = this.sitesProvider.getCurrentSiteUserId();
        return this.getAllcurses(userId,this.userCategoryId).then((courses) => {
            this.courses = courses;
            this.filteredCourses = this.courses;
            this.filter = '';
            this.initPrefetchCoursesIcon();
        });
    }   

    getAllcurses(userId?:number,catid?:number): Promise<any[]> {
        catid.toString()
        let selectQuery = 'category = ' + catid.toString();
        return this.appDB.getAllCateoryDB(CoreCoursesMyCoursesComponent.USER_CATEGORY_COURSES_TABLE,selectQuery);
    }
    
    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.myCoursesObserver && this.myCoursesObserver.off();
        this.siteUpdatedObserver && this.siteUpdatedObserver.off();
    }
}
