import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import type { PaginateModel } from 'mongoose'
import {
  Space,
  SpaceMember,
  User,
  Session,
  OtpCode,
  Project,
  ProjectMember,
} from './models'

@Injectable()
export class DbService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DbService.name)

  user: PaginateModel<User>
  space: PaginateModel<Space>
  spaceMember: PaginateModel<SpaceMember>
  project: PaginateModel<Project>
  projectMember: PaginateModel<ProjectMember>
  session: PaginateModel<Session>
  otpCode: PaginateModel<OtpCode>

  constructor(
    @InjectModel(User.name) private userModel: PaginateModel<User>,
    @InjectModel(Space.name) private spaceModel: PaginateModel<Space>,
    @InjectModel(SpaceMember.name)
    private spaceMemberModel: PaginateModel<SpaceMember>,
    @InjectModel(Project.name) private projectModel: PaginateModel<Project>,
    @InjectModel(ProjectMember.name)
    private projectMemberModel: PaginateModel<ProjectMember>,
    @InjectModel(Session.name) private sessionModel: PaginateModel<Session>,
    @InjectModel(OtpCode.name) private otpCodeModel: PaginateModel<OtpCode>,
  ) {
    this.user = userModel
    this.space = spaceModel
    this.spaceMember = spaceMemberModel
    this.project = projectModel
    this.projectMember = projectMemberModel
    this.session = sessionModel
    this.otpCode = otpCodeModel
  }

  onApplicationBootstrap(): any {
    const startTime = new Date().getTime()

    this.runMigrations().then(() => {
      this.logger.log(
        `Took ${~~((new Date().getTime() - startTime) / 100) / 10}s to migrate.`,
      )
    })
  }

  async runMigrations() {}
}
